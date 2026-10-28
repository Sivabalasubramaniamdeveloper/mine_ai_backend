import nodemailer from "nodemailer";
import axios from "axios";
import env from "../config/env.js";

let transporter = null;

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

export const sendWithResend = async ({ to, subject, text, html }) => {
  const apiKey = (env.resendApiKey || process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured in environment variables");
  }

  const recipients = String(to)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  // If MAIL_FROM is configured with a custom verified domain, use it.
  // If not set or uses unverified @gmail.com, default to Resend's verified sender: onboarding@resend.dev
  let sender = (process.env.MAIL_FROM || env.mailFrom || "").trim();
  if (!sender || sender.toLowerCase().includes("@gmail.com")) {
    sender = "MineAI <onboarding@resend.dev>";
  }

  const response = await axios.post(
    "https://api.resend.com/emails",
    {
      from: sender,
      to: recipients,
      reply_to: env.supportEmail || "mineai.support@gmail.com",
      subject,
      text,
      html,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  return { accepted: recipients, messageId: response.data?.id, provider: "resend" };
};

/**
 * Sends mail strictly via Resend (without any nodemailer fallback).
 * Used whenever mail is sent from the admin side or plan updates.
 */
export const sendAdminMail = async ({ to, subject, title, message, extraHtml = "" }) => {
  if (!to || typeof to !== "string" || !to.trim() || !to.includes("@")) {
    console.warn(`[AdminEmailService] Invalid recipient email passed to sendAdminMail: "${to}".`);
    return false;
  }
  const cleanTo = to.trim();
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const text = `${String(title)}\n\n${String(message)}\n\nMineAI Support: ${env.supportEmail || "mineai.support@gmail.com"}`;
  const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${safeTitle}</title>
        </head>
        <body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <div style="margin-bottom:20px;"><h2 style="color:#2357d8;margin:0;font-size:22px;font-weight:700;">MineAI</h2></div>
            <h1 style="color:#0f172a;font-size:18px;font-weight:600;margin:0 0 16px 0;">${safeTitle}</h1>
            <div style="color:#334155;line-height:1.65;font-size:15px;margin-bottom:20px;white-space:pre-wrap;">${safeMessage}</div>
            ${extraHtml}
            <div style="background:#f1f5f9;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:6px;margin:20px 0;"><p style="margin:0;font-size:12px;color:#475569;line-height:1.5;"><strong>Spam Folder Notice:</strong> If this email arrived in Spam, please mark it as Not Spam.</p></div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="color:#64748b;font-size:12px;margin:0;">MineAI Support: <a href="mailto:${env.supportEmail || "mineai.support@gmail.com"}" style="color:#2357d8;text-decoration:none;">${env.supportEmail || "mineai.support@gmail.com"}</a></p>
          </div>
        </body>
        </html>`;

  console.log(`[AdminEmailService] Dispatching email via Resend to "${cleanTo}", Subject: "${subject}"`);
  try {
    const result = await sendWithResend({ to: cleanTo, subject, text, html });
    console.log(`[AdminEmailService] Successfully sent via Resend. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    const resendErrMsg = error.response?.data?.message || error.message;
    console.error(`[AdminEmailService] Resend send error for ${cleanTo}: ${resendErrMsg}`);
    throw new Error(`Resend error: ${resendErrMsg}`);
  }
};

/**
 * Creates or retrieves the singleton Nodemailer transporter.
 * Automatically handles Gmail service mode and cleans whitespace from Google App Passwords.
 */
export const getTransporter = () => {
  if (!env.mailPassword) return null;

  if (!transporter) {
    const cleanPassword = env.mailPassword.replace(/\s+/g, "");
    const isGmail =
      env.mailHost === "smtp.gmail.com" ||
      (env.mailUser && env.mailUser.endsWith("@gmail.com"));

    transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: "gmail",
            auth: {
              user: env.mailUser,
              pass: cleanPassword,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          }
        : {
            host: env.mailHost,
            port: env.mailPort,
            secure: env.mailPort === 465,
            auth: {
              user: env.mailUser,
              pass: cleanPassword,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          }
    );
  }
  return transporter;
};

/**
 * Verifies the SMTP transporter connection.
 * @returns {Promise<boolean>}
 */
export const verifyTransporter = async () => {
  const client = getTransporter();
  if (!client) {
    throw new Error("Transporter cannot be initialized: MAIL_PASSWORD is missing.");
  }
  return await client.verify();
};

/**
 * Sends a responsive HTML & plain-text email from the MineAI mailbox.
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.title
 * @param {string} params.message
 * @returns {Promise<boolean>}
 */
export const sendMail = async ({ to, subject, title, message, extraHtml = "" }) => {
  if (!to || typeof to !== "string" || !to.trim() || !to.includes("@")) {
    console.warn(`[EmailService] Invalid recipient email passed to sendMail: "${to}". Email sending skipped.`);
    return false;
  }
  const cleanTo = to.trim();
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const text = `${String(title)}\n\n${String(message)}\n\nNotice: If this email arrived in your Spam folder, please mark it as Not Spam.\n\nMineAI Support: ${env.supportEmail}`;
  const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${safeTitle}</title>
        </head>
        <body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <div style="margin-bottom:20px;"><h2 style="color:#2357d8;margin:0;font-size:22px;font-weight:700;">MineAI</h2></div>
            <h1 style="color:#0f172a;font-size:18px;font-weight:600;margin:0 0 16px 0;">${safeTitle}</h1>
            <div style="color:#334155;line-height:1.65;font-size:15px;margin-bottom:20px;white-space:pre-wrap;">${safeMessage}</div>
            ${extraHtml}
            <div style="background:#f1f5f9;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:6px;margin:20px 0;"><p style="margin:0;font-size:12px;color:#475569;line-height:1.5;"><strong>Spam Folder Notice:</strong> If this email arrived in Spam or Junk, move it to your Inbox or mark it as Not Spam.</p></div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="color:#64748b;font-size:12px;margin:0;">MineAI Support: <a href="mailto:${env.supportEmail}" style="color:#2357d8;text-decoration:none;">${env.supportEmail}</a></p>
          </div>
        </body>
        </html>`;

  const hasResend = !!(env.resendApiKey || process.env.RESEND_API_KEY);
  console.log(`[EmailService] Attempting to send email. Provider: ${hasResend ? "Resend HTTPS API" : "Nodemailer SMTP"}, To: "${cleanTo}", Subject: "${subject}"`);

  if (hasResend) {
    try {
      const result = await sendWithResend({ to: cleanTo, subject, text, html });
      console.log(`[EmailService] Resend successfully delivered email to ${cleanTo}. MessageId: ${result.messageId}`);
      return result;
    } catch (error) {
      const resendErrMsg = error.response?.data?.message || error.message;
      console.error(`[EmailService] Resend delivery error for ${cleanTo}: ${resendErrMsg}`);
      return false;
    }
  }

  const client = getTransporter();
  if (!client) {
    console.warn("[EmailService] Email not sent: configure RESEND_API_KEY or MAIL_PASSWORD.");
    return false;
  }

  try {
    const msgId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@mineai.app>`;

    const info = await client.sendMail({
      from: env.mailFrom,
      sender: env.mailUser,
      replyTo: env.supportEmail || env.mailUser,
      to: cleanTo,
      subject,
      text,
      messageId: msgId,
      headers: {
        "X-Mailer": "MineAI Email Engine",
        "X-Priority": "3",
        "Importance": "Normal",
      },
      html,
    });

    console.log(`[EmailService] Email sent successfully to ${cleanTo}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${cleanTo}:`, error.message);
    throw error;
  }
};

/**
 * Sends formatted monthly expense summary report to registered user email
 */
export const sendExpenseReportEmail = async ({
  to,
  userName = "Valued User",
  monthYear,
  totalIncome = 0,
  totalExpense = 0,
  balance = 0,
  categorySummary = [],
}) => {
  const categoryRows = categorySummary
    .map(
      (c) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#334155;">${c.category}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#0f172a;">₹${Number(c.spent).toFixed(2)}</td></tr>`
    )
    .join("");

  const message = `Hello ${userName},\n\nHere is your Monthly Financial Summary for ${monthYear}:\n\n• Total Income: ₹${Number(totalIncome).toFixed(2)}\n• Total Expenses: ₹${Number(totalExpense).toFixed(2)}\n• Net Balance: ₹${Number(balance).toFixed(2)}\n\nReview your budgets and transactions inside MineAI.`;

  return sendMail({
    to,
    subject: `Monthly Expense Report - ${monthYear} | MineAI`,
    title: `Monthly Financial Report (${monthYear})`,
    message,
    extraHtml: `
      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #e2e8f0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;">Total Income:</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#10b981;">₹${Number(totalIncome).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Total Expenses:</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#ef4444;">₹${Number(totalExpense).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Net Balance:</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#2563eb;">₹${Number(balance).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      ${
        categoryRows
          ? `
        <h3 style="font-size:14px;color:#0f172a;margin:16px 0 8px 0;font-weight:600;">Spending Breakdown</h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;">
          ${categoryRows}
        </table>
      `
          : ""
      }
    `,
  });
};

/**
 * Sends welcome emails upon confirmed signup / first login via Resend.
 * @param {string} email
 * @param {string} [fullName]
 */
export const sendWelcomeEmails = async (email, fullName = "") => {
  const nameGreeting = fullName ? `Hello ${fullName},` : "Hello,";
  await sendAdminMail({
    to: email,
    subject: "Welcome to MineAI! 🚀",
    title: "Welcome to MineAI",
    message: `${nameGreeting}\n\nWelcome to MineAI! Your email is verified and your account is ready.\n\nYou now have access to cutting-edge AI assistants, daily budget and expense analytics, real-time localized news, and smart shopping comparisons.\n\nThank you for choosing MineAI. If you need anything, our support team is always here for you.`,
  });

  await sendAdminMail({
    to: email,
    subject: "Your MineAI Basic plan is active",
    title: "Basic plan activated",
    message: "Your Basic plan is active. Open MineAI any time to explore your daily credits and available features.",
  });
};

/**
 * Sends notification when a user's subscription plan is updated.
 * Dispatched strictly via Resend from admin side / support.
 * @param {string} email
 * @param {string} planName
 */
export const sendPlanChangedEmail = async (email, planName) => {
  return sendAdminMail({
    to: email,
    subject: `Your MineAI plan has been updated to ${planName}`,
    title: "Subscription Plan Updated",
    message: `Your MineAI subscription plan has been successfully updated to the ${planName} plan.\n\nAll updated quotas (daily AI credits, budget categories, and smart scrapes) are now active in your account.`,
  });
};

/**
 * Sends complete ticket details to the user upon ticket submission.
 * Dispatched strictly via Resend from admin side.
 * @param {object} ticket
 */
export const sendTicketDetailsToUser = async (ticket) => {
  const userEmail = ticket.user_email || ticket.email;
  if (!userEmail || !userEmail.includes("@")) {
    console.warn(`[TicketEmail] No valid user email for ticket ${ticket.id}; skipping email dispatch.`);
    return false;
  }

  const extraHtml = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:16px 0;">
      <h3 style="margin:0 0 12px 0;font-size:15px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Ticket Summary & Details</h3>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-weight:600;width:35%;">Ticket Reference:</td>
          <td style="padding:6px 0;color:#0f172a;font-weight:700;">${ticket.id}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-weight:600;">Subject:</td>
          <td style="padding:6px 0;color:#0f172a;">${escapeHtml(ticket.subject)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-weight:600;">Module / Area:</td>
          <td style="padding:6px 0;color:#0f172a;text-transform:uppercase;">${escapeHtml(ticket.module || "General")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-weight:600;">Category:</td>
          <td style="padding:6px 0;color:#0f172a;text-transform:capitalize;">${escapeHtml(ticket.category || "Issue")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-weight:600;">Priority:</td>
          <td style="padding:6px 0;color:#2563eb;font-weight:700;text-transform:uppercase;">${escapeHtml(ticket.priority || "Medium")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-weight:600;">Current Status:</td>
          <td style="padding:6px 0;color:#16a34a;font-weight:700;text-transform:capitalize;">${escapeHtml(ticket.status || "Open / Under Review")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-weight:600;">Submitted At:</td>
          <td style="padding:6px 0;color:#0f172a;">${new Date(ticket.created_at || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
        </tr>
      </table>
      <div style="margin-top:16px;padding:12px;background:#ffffff;border-radius:8px;border:1px solid #cbd5e1;">
        <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#475569;">Your Description / Issue Details:</p>
        <p style="margin:0;font-size:13px;color:#0f172a;white-space:pre-wrap;line-height:1.5;">${escapeHtml(ticket.description || "None provided")}</p>
      </div>
    </div>
  `;

  return sendAdminMail({
    to: userEmail,
    subject: `[MineAI Support ${ticket.id}] We Received Your Ticket: ${ticket.subject}`,
    title: "Support Ticket Confirmation",
    message: `Dear ${ticket.user_name || "Valued User"},\n\nWe have received your support ticket regarding module "${ticket.module}". Our technical support team has been notified and is currently reviewing your issue.\n\nHere are all the details of your ticket for your records:`,
    extraHtml,
  });
};
