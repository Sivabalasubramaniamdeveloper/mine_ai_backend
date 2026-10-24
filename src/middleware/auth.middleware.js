import supabaseAuth from "../config/supabase-auth.js";
import supabase from "../config/supabase.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      // If token expired in Supabase default window, check if it was issued within 1 week (7 days)
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64").toString("utf8")
          );
          const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
          const issuedAtMs = payload.iat ? payload.iat * 1000 : 0;

          if (Date.now() - issuedAtMs < ONE_WEEK_MS && payload.sub) {
            const { data: dbUser, error: dbErr } = await supabase
              .from("users")
              .select("id, email, username, full_name")
              .eq("id", payload.sub)
              .maybeSingle();

            if (dbUser && !dbErr) {
              req.user = {
                id: dbUser.id,
                email: dbUser.email,
                user_metadata: {
                  full_name: dbUser.full_name,
                  username: dbUser.username,
                },
                ...payload,
              };
              return next();
            }
          }
        }
      } catch (_) {}

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
