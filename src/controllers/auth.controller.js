import * as authService from "../services/auth.service.js";
import { sendMail, verifyTransporter } from "../services/email.service.js";

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
