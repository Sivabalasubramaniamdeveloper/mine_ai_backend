import * as authService from "../services/auth.service.js";

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

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



export const refreshSession = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    const { data, error } =
      await supabaseAuth.auth.refreshSession({
        refresh_token,
      });

    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is invalid or expired. Please log in again.",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: data.session.token_type,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
