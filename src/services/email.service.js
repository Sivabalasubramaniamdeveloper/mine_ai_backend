/**
 * Email Service (Backend)
 * All email dispatching is handled directly by the client applications (Flutter apps)
 * using `package:mailer` via Gmail SMTP.
 * All nodemailer and Resend integrations have been removed from the backend.
 */

export const sendWithResend = async ({ to, subject, text, html }) => {
  console.log(`[EmailService] sendWithResend skipped. Client Flutter app handles email delivery to ${to}.`);
  return { accepted: [to], messageId: "client_mailer_handled", provider: "flutter_mailer" };
};

export const sendAdminMail = async ({ to, subject, title, message, extraHtml = "" }) => {
  console.log(`[EmailService] sendAdminMail skipped for ${to}. Email dispatch handled by Flutter mailer.`);
  return true;
};

export const getTransporter = () => {
  return null;
};

export const verifyTransporter = async () => {
  return true;
};

export const sendMail = async ({ to, subject, title, message, extraHtml = "" }) => {
  console.log(`[EmailService] sendMail skipped for ${to}. Dispatched via Flutter mailer.`);
  return { accepted: [to], messageId: "client_mailer_handled" };
};

export const sendExpenseReportEmail = async ({ to, userName, periodLabel, summary, topCategories = [], csvAttachment = null, pdfAttachment = null }) => {
  console.log(`[EmailService] Expense report email to ${to} is handled by Flutter client.`);
  return { accepted: [to], messageId: "client_mailer_handled" };
};

export const sendWelcomeEmails = async (email, fullName = "") => {
  console.log(`[EmailService] Welcome email to ${email} is dispatched directly from Flutter client.`);
  return { accepted: [email], messageId: "client_mailer_handled" };
};

export const sendPlanChangedEmail = async (email, planName) => {
  console.log(`[EmailService] Plan update email to ${email} for "${planName}" is dispatched directly from Flutter admin app.`);
  return { accepted: [email], messageId: "client_mailer_handled" };
};

export const sendTicketDetailsToUser = async (ticket) => {
  console.log(`[EmailService] Ticket details email for #${ticket?.id} is dispatched directly from Flutter client.`);
  return { accepted: [ticket?.user_email], messageId: "client_mailer_handled" };
};
