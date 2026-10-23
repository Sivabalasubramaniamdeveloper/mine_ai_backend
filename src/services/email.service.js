import nodemailer from "nodemailer";
import env from "../config/env.js";

let transporter = null;

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
export const sendMail = async ({ to, subject, title, message }) => {
  const client = getTransporter();
  if (!client) {
    console.warn("[EmailService] Email not sent: MAIL_PASSWORD is not configured in .env");
    return false;
  }

  const safeTitle = String(title).replace(/[<>]/g, "");
  const safeMessage = String(message).replace(/[<>]/g, "");

  try {
    const msgId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@mineai.app>`;

    const info = await client.sendMail({
      from: env.mailFrom,
      sender: env.mailUser,
      replyTo: env.supportEmail || env.mailUser,
      to,
      subject,
      text: `${safeTitle}\n\n${safeMessage}\n\nMineAI Support: ${env.supportEmail}`,
      messageId: msgId,
      headers: {
        "X-Mailer": "MineAI Email Engine",
        "X-Priority": "3",
        "Importance": "Normal",
      },
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${safeTitle}</title>
        </head>
        <body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <div style="margin-bottom:20px;">
              <h2 style="color:#2357d8;margin:0;font-size:22px;font-weight:700;">MineAI</h2>
            </div>
            <h1 style="color:#0f172a;font-size:18px;font-weight:600;margin:0 0 16px 0;">${safeTitle}</h1>
            <div style="color:#334155;line-height:1.65;font-size:15px;margin-bottom:24px;white-space:pre-wrap;">${safeMessage}</div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="color:#64748b;font-size:12px;margin:0;">
              MineAI Support: <a href="mailto:${env.supportEmail}" style="color:#2357d8;text-decoration:none;">${env.supportEmail}</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Sends welcome emails upon confirmed signup / first login.
 * @param {string} email
 */
export const sendWelcomeEmails = async (email) => {
  await sendMail({
    to: email,
    subject: "Welcome to MineAI",
    title: "Welcome to MineAI",
    message: "Your email is verified and your account is ready. Thanks for joining us.",
  });
  await sendMail({
    to: email,
    subject: "Your MineAI Basic plan is active",
    title: "Basic plan activated",
    message: "Your Basic plan is active. Open MineAI any time to explore your plan and available features.",
  });
};

/**
 * Sends notification when user updates their subscription plan.
 * @param {string} email
 * @param {string} planName
 */
export const sendPlanChangedEmail = async (email, planName) => {
  return sendMail({
    to: email,
    subject: "Your MineAI plan has changed",
    title: "Plan updated",
    message: `Your MineAI plan is now ${planName}. The change is active in your account.`,
  });
};
