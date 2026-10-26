import nodemailer from "nodemailer";
import supabase from "../config/supabase.js";
import env from "../config/env.js";
import { resolveApiKey } from "./keyResolver.service.js";
import { consumeCredits } from "./credit.service.js";
import { generateGeminiResponse } from "../providers/gemini.provider.js";
import { decrypt, encrypt } from "../utils/encryption.js";
import {
  createApiKey,
  getUserApiKeys,
  deleteApiKey,
} from "../repositories/apiKey.repository.js";

const PLAN_DRAFT_LIMITS = { 0: 5, 1: 20, 2: 50 };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const getDraftLimit = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("plans(tier_code)")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return PLAN_DRAFT_LIMITS[data?.plans?.tier_code] ?? PLAN_DRAFT_LIMITS[0];
};

/**
 * Resolves or creates the email_smtp provider in ai_providers
 */
const getSmtpProviderId = async () => {
  const { data: existing } = await supabase
    .from("ai_providers")
    .select("id")
    .eq("name", "email_smtp")
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("ai_providers")
    .insert({
      name: "email_smtp",
      display_name: "Email SMTP / App Password",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id;
};

/**
 * 1. Generate Email with AI
 * Costs 20 credits per generation.
 */
export const generateEmail = async ({
  userId,
  userName = null,
  instructions,
  tone = "Professional",
  model = "gemini-3.8-flash",
}) => {
  if (!instructions || !instructions.trim()) {
    const err = new Error("Email instructions/prompt is required");
    err.statusCode = 400;
    throw err;
  }

  // Resolve sender's name
  let senderName = userName;
  if (!senderName) {
    const { data: userRow } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    senderName = userRow?.full_name || (userRow?.email ? userRow.email.split("@")[0] : "User");
  }

  // 1. Consume 20 credits
  const creditStatus = await consumeCredits({
    userId,
    amount: 20,
    actionType: "email_generation",
  });

  // 2. Resolve Gemini API key (user key if present, otherwise platform key)
  const keyData = await resolveApiKey({
    userId,
    providerName: "gemini",
  });

  // 3. Call Gemini with sender's name included
  const prompt = `You are an elite communication assistant. Write a high-impact, beautifully composed email according to these instructions:
SENDER NAME: ${senderName}
TONE: ${tone}
INSTRUCTIONS: ${instructions}

Format rules:
1. Provide a clear, relevant Subject line.
2. Provide a well-structured Body with suitable salutation, paragraphs, and professional sign-off.
3. Use "${senderName}" as the sender in the sign-off at the end of the email (do NOT write "[Your Name]" or placeholders).
4. Return ONLY a valid JSON object with EXACTLY this structure:
{
  "subject": "Email subject here",
  "body": "Dear [Recipient],\\n\\nEmail body text here...\\n\\nBest regards,\\n${senderName}"
}
Do not include any explanations, markdown code fences, or text outside the JSON.`;

  const startedAt = Date.now();
  let aiResponse;
  try {
    aiResponse = await generateGeminiResponse({
      apiKey: keyData.apiKey,
      model,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error) {
    // Log failure
    await supabase.from("usage_logs").insert({
      user_id: userId,
      provider_id: keyData.provider.id,
      model,
      request_type: "email_generation",
      credits_used: 0,
      response_time_ms: Date.now() - startedAt,
      status: "failed",
      error_message: error.message,
      api_key_source: keyData.source,
      api_key_id: keyData.apiKeyId,
    });
    throw error;
  }

  // Parse JSON response
  let rawText = aiResponse.text.trim();
  // Strip markdown fences if present
  if (rawText.startsWith("```")) {
    rawText = rawText.replace(/^```[a-zA-Z]*\n/, "").replace(/```$/, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Fallback: extract subject and body manually
    const lines = rawText.split("\n");
    let subject = "Generated Email";
    let body = rawText;
    const subjMatch = rawText.match(/subject[:\s]+([^\n]+)/i);
    if (subjMatch) {
      subject = subjMatch[1].replace(/["']/g, "").trim();
    }
    parsed = { subject, body };
  }

  // 4. Record usage log
  await supabase.from("usage_logs").insert({
    user_id: userId,
    provider_id: keyData.provider.id,
    model,
    request_type: "email_generation",
    input_tokens: aiResponse.inputTokens,
    output_tokens: aiResponse.outputTokens,
    total_tokens: aiResponse.totalTokens,
    credits_used: 20,
    response_time_ms: Date.now() - startedAt,
    status: "success",
    api_key_source: keyData.source,
    api_key_id: keyData.apiKeyId,
  });

  return {
    subject: parsed.subject || "No Subject",
    body: parsed.body || "",
    tone,
    credits_used: 20,
    credits_left: creditStatus.creditsLeft,
    api_key_source: keyData.source,
  };
};

/**
 * 2. Get user's SMTP/App password status
 */
export const getSmtpConfigStatus = async (userId) => {
  const providerId = await getSmtpProviderId();

  const { data } = await supabase
    .from("user_api_keys")
    .select("id, key_name, key_last_four, is_active, created_at")
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Also get user email
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  return {
    is_configured: !!data,
    key_id: data?.id || null,
    key_name: data?.key_name || null,
    key_last_four: data?.key_last_four || null,
    email: user?.email || null,
  };
};

/**
 * 3. Save or update user's email App Password
 */
export const saveSmtpConfig = async (userId, { app_password, key_name }) => {
  if (!app_password || !app_password.trim()) {
    const err = new Error("App Password is required");
    err.statusCode = 400;
    throw err;
  }

  const cleanPassword = app_password.replace(/\s+/g, "");
  if (cleanPassword.length < 8) {
    const err = new Error("App Password is too short (Google App Passwords are 16 letters)");
    err.statusCode = 400;
    throw err;
  }

  const providerId = await getSmtpProviderId();

  // Deactivate any existing smtp key for this user
  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider_id", providerId);

  const encryptedKey = encrypt(cleanPassword);
  const keyLastFour = cleanPassword.slice(-4);

  const saved = await createApiKey({
    user_id: userId,
    provider_id: providerId,
    key_name: key_name || "Gmail App Password",
    encrypted_key: encryptedKey,
    key_last_four: keyLastFour,
    is_active: true,
  });

  return {
    is_configured: true,
    key_id: saved.id,
    key_name: saved.key_name,
    key_last_four: saved.key_last_four,
  };
};

/**
 * 4. Delete user's email App Password
 */
export const deleteSmtpConfig = async (userId) => {
  const providerId = await getSmtpProviderId();
  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider_id", providerId);

  return { is_configured: false };
};

export const getSavedEmails = async (userId) => {
  const [{ data, error }, limit] = await Promise.all([
    supabase.from("saved_emails").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    getDraftLimit(userId),
  ]);
  if (error) throw new Error(error.message);
  return { emails: data || [], limit };
};

export const saveEmailDraft = async (userId, { label, recipient, subject, body, tone }) => {
  if (!subject?.trim() || !body?.trim()) {
    const err = new Error("Email subject and body are required");
    err.statusCode = 400;
    throw err;
  }
  const limit = await getDraftLimit(userId);
  const { count, error: countError } = await supabase
    .from("saved_emails").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (countError) throw new Error(countError.message);
  if ((count || 0) >= limit) {
    const err = new Error(`Saved email limit reached (${limit} emails for your plan)`);
    err.statusCode = 429;
    throw err;
  }
  const { data, error } = await supabase.from("saved_emails").insert({
    user_id: userId, label: label?.trim() || "General", recipient: recipient?.trim() || null,
    subject: subject.trim(), body: body.trim(), tone: tone?.trim() || "Professional",
  }).select().single();
  if (error) throw new Error(error.message);
  return { email: data, limit };
};

export const deleteSavedEmail = async (userId, id) => {
  const { error } = await supabase.from("saved_emails").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
};

/**
 * 5. Send Email directly through application
 */
export const sendDirectEmail = async ({
  userId,
  to,
  cc = null,
  subject,
  body,
}) => {
  if (!to || !to.trim()) {
    const err = new Error("Recipient 'to' email address is required");
    err.statusCode = 400;
    throw err;
  }
  const recipients = to.split(",").map((item) => item.trim()).filter(Boolean);
  if (!recipients.length || recipients.some((item) => !emailPattern.test(item))) {
    const err = new Error("Enter a valid recipient email address");
    err.statusCode = 400;
    throw err;
  }
  if (cc?.trim() && cc.split(",").map((item) => item.trim()).some((item) => !emailPattern.test(item))) {
    const err = new Error("Enter valid CC email addresses");
    err.statusCode = 400;
    throw err;
  }

  if (!subject || !subject.trim()) {
    const err = new Error("Email subject is required");
    err.statusCode = 400;
    throw err;
  }

  // Get user profile email
  const { data: user } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  const userEmail = user?.email;
  if (!userEmail) {
    const err = new Error("User account email not found");
    err.statusCode = 400;
    throw err;
  }

  // Get user's active email app password
  const providerId = await getSmtpProviderId();
  const { data: keyRow } = await supabase
    .from("user_api_keys")
    .select("id, encrypted_key, is_active")
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .maybeSingle();

  if (!keyRow) {
    const err = new Error("EMAIL_PASSWORD_NOT_CONFIGURED");
    err.statusCode = 404;
    err.code = "EMAIL_PASSWORD_NOT_CONFIGURED";
    throw err;
  }

  let decryptedPassword;
  try {
    decryptedPassword = decrypt(keyRow.encrypted_key);
  } catch {
    const err = new Error("Could not decrypt saved app password");
    err.statusCode = 500;
    throw err;
  }

  const cleanPass = decryptedPassword.replace(/\s+/g, "");

  // Use the email stored in key_name if it is a valid email, else account email
  const senderEmail = (keyRow.key_name && keyRow.key_name.includes("@"))
    ? keyRow.key_name.trim()
    : userEmail;

  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  const mailOptions = {
    from: `"${user?.full_name || "MineAI User"}" <${senderEmail}>`,
    sender: senderEmail,
    replyTo: senderEmail,
    to: to.trim(),
    subject: subject.trim(),
    text: body,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1e293b;line-height:1.65;background-color:#ffffff;"><div style="max-width:600px;">${safeBody}</div></body></html>`,
  };

  if (cc && cc.trim()) {
    mailOptions.cc = cc.trim();
  }

  const sendWithPort = async (port, secure) => {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: senderEmail,
        pass: cleanPass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    return await transporter.sendMail(mailOptions);
  };

  let info;
  try {
    // Try standard Gmail SSL port 465 first
    info = await sendWithPort(465, true);
  } catch (err465) {
    console.warn(`[EmailHelper] Port 465 attempt failed: ${err465.message}. Retrying on port 587 (STARTTLS)...`);
    try {
      // Fallback to TLS port 587
      info = await sendWithPort(587, false);
    } catch (err587) {
      console.error(`[EmailHelper] Port 587 attempt also failed: ${err587.message}`);
      const isTimeout =
        err465.message?.includes("timeout") ||
        err587.message?.includes("timeout") ||
        err465.code === "ETIMEDOUT" ||
        err587.code === "ETIMEDOUT";

      if (isTimeout) {
        const err = new Error(
          "Connection timeout connecting to smtp.gmail.com. Cloud platforms like Railway block outbound SMTP ports (465/587). Please request SMTP unblock in Railway settings or use Railway Pro."
        );
        err.statusCode = 504;
        throw err;
      }
      const err = new Error(`Failed to send email: ${err587.message}`);
      err.statusCode = 500;
      throw err;
    }
  }

  console.log(`[EmailHelper] Direct email sent from ${userEmail} to ${to}: ${info.messageId}`);
  return {
    success: true,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    deliveryStatus: (info.rejected || []).length ? "partially_accepted" : "accepted_by_mail_server",
    deliveryNotice: "The mail server accepted this message. Delivery to Inbox cannot be guaranteed; recipients may need to check Spam or Junk.",
    messageId: info.messageId,
    from: userEmail,
    to,
    cc,
    subject,
  };
};
