import supabase from "../config/supabase.js";
import { resolveApiKey } from "./keyResolver.service.js";
import { consumeCredits } from "./credit.service.js";
import { generateGeminiResponse } from "../providers/gemini.provider.js";
import { sendMail } from "./email.service.js";

/**
 * Extracts structured task from free-form user speech or text prompt.
 * Consumes 10 credits.
 */
export const extractTask = async ({
  userId,
  prompt,
  model = "gemini-2.5-flash",
}) => {
  if (!prompt || !prompt.trim()) {
    const err = new Error("Voice/Text prompt is required");
    err.statusCode = 400;
    throw err;
  }

  // 1. Consume 10 credits
  const creditStatus = await consumeCredits({
    userId,
    amount: 10,
    actionType: "task_extraction",
  });

  // 2. Resolve Gemini API key
  const keyData = await resolveApiKey({
    userId,
    providerName: "gemini",
  });

  // Reference current date for relative dates like "tomorrow"
  const now = new Date();
  const currentDateStr = now.toISOString().split("T")[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split("T")[0];

  const systemPrompt = `You are an AI task and calendar assistant.
Current date reference: Today is ${currentDateStr}, Tomorrow is ${tomorrowDateStr}.
Analyze the user's spoken instruction and extract structured task fields.
User Instruction: "${prompt}"

Return ONLY a valid JSON object with EXACTLY this structure:
{
  "title": "Concise task or meeting title",
  "category": "Work or Personal or Study or Health or Finance",
  "date_display": "e.g. Tomorrow or Monday or Oct 22",
  "date_iso": "YYYY-MM-DD",
  "time_display": "e.g. 10:00 AM",
  "time_iso": "HH:MM",
  "location": "Location if mentioned or null",
  "details": "Details or notes if mentioned or null"
}
Do not include any explanations, markdown code fences, or text outside the JSON.`;

  const startedAt = Date.now();
  let aiResponse;
  try {
    aiResponse = await generateGeminiResponse({
      apiKey: keyData.apiKey,
      model,
      messages: [{ role: "user", content: systemPrompt }],
    });
  } catch (error) {
    await supabase.from("usage_logs").insert({
      user_id: userId,
      provider_id: keyData.provider.id,
      model,
      request_type: "task_extraction",
      credits_used: 0,
      response_time_ms: Date.now() - startedAt,
      status: "failed",
      error_message: error.message,
      api_key_source: keyData.source,
      api_key_id: keyData.apiKeyId,
    });
    throw error;
  }

  let rawText = aiResponse.text.trim();
  if (rawText.startsWith("```")) {
    rawText = rawText.replace(/^```[a-zA-Z]*\n/, "").replace(/```$/, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = {
      title: prompt.slice(0, 50),
      category: "Work",
      date_display: "Tomorrow",
      date_iso: tomorrowDateStr,
      time_display: "10:00 AM",
      time_iso: "10:00",
      location: null,
      details: prompt,
    };
  }

  // 3. Record usage log
  await supabase.from("usage_logs").insert({
    user_id: userId,
    provider_id: keyData.provider.id,
    model,
    request_type: "task_extraction",
    input_tokens: aiResponse.inputTokens,
    output_tokens: aiResponse.outputTokens,
    total_tokens: aiResponse.totalTokens,
    credits_used: 10,
    response_time_ms: Date.now() - startedAt,
    status: "success",
    api_key_source: keyData.source,
    api_key_id: keyData.apiKeyId,
  });

  return {
    task: parsed,
    credits_used: 10,
    credits_left: creditStatus.creditsLeft,
    api_key_source: keyData.source,
  };
};

/**
 * Sends task confirmation email to the user
 */
export const notifyTaskEmail = async (userId, task) => {
  const { data: user } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!user?.email) {
    const err = new Error("User email not found");
    err.statusCode = 400;
    throw err;
  }

  const title = task.title || "Scheduled Task";
  const category = task.category || "General";
  const dateStr = task.date_display || task.date_iso || "Scheduled Date";
  const timeStr = task.time_display || task.time_iso || "Scheduled Time";
  const location = task.location ? `\n📍 Location: ${task.location}` : "";
  const details = task.details ? `\n📝 Details: ${task.details}` : "";

  const subject = `Task Scheduled: ${title} (${dateStr} at ${timeStr})`;
  const messageBody = `Hello ${user.full_name || "there"},\n\nYour AI Assistant has scheduled the following task:\n\n• Task: ${title}\n• Category: ${category}\n• Date: ${dateStr}\n• Time: ${timeStr}${location}${details}\n\nThis event has also been prepared for your Calendar.`;

  await sendMail({
    to: user.email,
    subject,
    title: `Task Reminder: ${title}`,
    message: messageBody,
  });

  return { success: true, email: user.email };
};
