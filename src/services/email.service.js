import nodemailer from "nodemailer";
import env from "../config/env.js";

let transporter;

// Creates one reusable Gmail SMTP connection when mail credentials are configured.
const getTransporter = () => {
  if (!env.mailPassword) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mailHost,
      port: env.mailPort,
      secure: env.mailPort === 465,
      auth: { user: env.mailUser, pass: env.mailPassword },
    });
  }
  return transporter;
};

// Sends simple responsive HTML and plain text email from the MineAI support mailbox.
const sendMail = async ({ to, subject, title, message }) => {
  const client = getTransporter();
  if (!client) {
    console.warn("Email was not sent because MAIL_PASSWORD is not configured.");
    return false;
  }
  const safeTitle = String(title).replace(/[<>]/g, "");
  const safeMessage = String(message).replace(/[<>]/g, "");
  await client.sendMail({
    from: env.mailFrom,
    to,
    subject,
    text: `${title}\n\n${message}\n\nMineAI Support: ${env.supportEmail}`,
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:28px;color:#202124;border:1px solid #e5e7eb;border-radius:16px"><h1 style="color:#2357d8">${safeTitle}</h1><p style="line-height:1.6">${safeMessage}</p><p style="margin-top:32px;color:#6b7280">MineAI · <a href="mailto:${env.supportEmail}">${env.supportEmail}</a></p></main>`,
  });
  return true;
};

// Welcomes a newly confirmed account and confirms its default Basic plan once.
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

// Confirms a plan change after the selected plan has been saved successfully.
export const sendPlanChangedEmail = async (email, planName) =>
  sendMail({
    to: email,
    subject: "Your MineAI plan has changed",
    title: "Plan updated",
    message: `Your MineAI plan is now ${planName}. The change is active in your account.`,
  });
