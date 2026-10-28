import * as authService from "../services/auth.service.js";
import { sendMail, verifyTransporter, sendWelcomeEmails } from "../services/email.service.js";

// Dispatches a welcome email via Resend when a user first signs up
export const sendSignupWelcome = async (req, res, next) => {
  try {
    const { email, full_name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    await sendWelcomeEmails(email, full_name);
    return res.status(200).json({
      success: true,
      message: "Welcome email dispatched successfully via Resend",
    });
  } catch (error) {
    next(error);
  }
};

// Authenticates credentials and returns Supabase's access and refresh tokens.
export const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Rotates the Supabase session using the submitted refresh token.
export const refreshSession = async (req, res, next) => {
  try {
    const data = await authService.refreshSession(req.body.refresh_token);
    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Dispatches a password recovery email to the user.
export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Sends a test email to verify SMTP credentials and connectivity.
export const testEmail = async (req, res, next) => {
  try {
    const targetEmail = req.body.email || req.query.email || "mineai.support@gmail.com";
    await verifyTransporter();
    await sendMail({
      to: targetEmail,
      subject: "MineAI SMTP Connection Verified",
      title: "Mail Configuration Active",
      message: "Your Gmail SMTP configuration in MineAI is successfully authenticated and delivering emails properly.",
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${targetEmail}`,
    });
  } catch (error) {
    next(error);
  }
};
