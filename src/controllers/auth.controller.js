import * as authService from "../services/auth.service.js";

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
