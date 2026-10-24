import supabase from "../config/supabase.js";
import { createUserProfile } from "../repositories/user.repository.js";
import { createUserSettings } from "../repositories/user-settings.repository.js";
import supabaseAuth from "../config/supabase-auth.js";
import { sendWelcomeEmails } from "./email.service.js";

// Creates the app profile after Supabase confirms the user can authenticate.
const ensureApplicationProfile = async (authUser) => {
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!existing) {
    const { data: basicPlan, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("tier_code", 0)
      .single();
    if (planError) throw planError;

    const metadata = authUser.user_metadata ?? {};
    const localPart = (authUser.email ?? "user").split("@")[0];
    const usernameBase = (metadata.username || localPart)
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .slice(0, 20);
    const username = `${usernameBase}_${authUser.id.slice(0, 8)}`;
    const profile = {
      id: authUser.id,
      email: authUser.email,
      username,
      full_name: metadata.full_name || localPart,
      dob: metadata.dob || "2000-01-01",
      gender: metadata.gender || "prefer_not_to_say",
      country_code: metadata.country_code || "IN",
      timezone: metadata.timezone || "UTC",
      language: metadata.language || "en",
      credits: 100,
      plan_id: basicPlan.id,
    };

    // A short user ID suffix keeps generated usernames unique across signups.
    try {
      await createUserProfile(profile);
      // A verified first login creates the profile and sends one welcome/Basic-plan email pair.
      void sendWelcomeEmails(authUser.email).catch((error) =>
        console.error("Could not send account welcome emails:", error.message),
      );
    } catch (error) {
      // Concurrent first logins can race on the same user ID; accept only that completed insert.
      if (error.code !== "23505") throw error;
      const { data: concurrentProfile, error: concurrentLookupError } =
        await supabase
          .from("users")
          .select("id")
          .eq("id", authUser.id)
          .maybeSingle();
      if (concurrentLookupError || !concurrentProfile) throw error;
    }
  }

  const { data: settings, error: settingsLookupError } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (settingsLookupError) throw settingsLookupError;
  if (!settings) {
    try {
      await createUserSettings(authUser.id);
    } catch (error) {
      // A parallel first login may have created the settings row after the lookup.
      if (error.code !== "23505") throw error;
    }
  }
};

// Authenticates with Supabase, rejects unverified email, then initializes app records.
export const login = async ({ email, password }) => {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      const unverified = new Error("Email address has not been verified");
      unverified.statusCode = 403;
      unverified.code = "EMAIL_NOT_CONFIRMED";
      throw unverified;
    }
    const invalidCredentials = new Error("Invalid email or password");
    invalidCredentials.statusCode = 401;
    throw invalidCredentials;
  }

  await ensureApplicationProfile(data.user);

  const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds (1 week)
  const expiresAt = Math.floor(Date.now() / 1000) + ONE_WEEK_SECONDS;

  return {
    user: { id: data.user.id, email: data.user.email },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: expiresAt,
      expires_in: ONE_WEEK_SECONDS,
    },
  };
};

// Exchanges a refresh token and returns the rotated Supabase session.
export const refreshSession = async (refreshToken) => {
  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) {
    const invalidRefresh = new Error(
      "Refresh token is invalid or expired. Please log in again.",
    );
    invalidRefresh.statusCode = 401;
    invalidRefresh.code = "INVALID_REFRESH_TOKEN";
    throw invalidRefresh;
  }

  const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;
  const expiresAt = Math.floor(Date.now() / 1000) + ONE_WEEK_SECONDS;

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token_type: data.session.token_type,
    expires_in: ONE_WEEK_SECONDS,
    expires_at: expiresAt,
    user: { id: data.user.id, email: data.user.email },
  };
};

// Requests a password recovery link or token for the provided email address.
export const forgotPassword = async ({ email }) => {
  if (!email || !email.trim()) {
    const err = new Error("Email address is required");
    err.statusCode = 400;
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo:
        process.env.PASSWORD_RECOVERY_REDIRECT_URI ||
        "mineai://reset-password",
    });

    if (error) {
      console.warn("Supabase resetPasswordForEmail notice:", error.message);
    }
  } catch (err) {
    console.warn("Forgot password dispatch warning:", err.message);
  }

  // Always return a generic success response to prevent email enumeration
  return {
    success: true,
    message: "If an account exists with this email, password reset instructions have been sent.",
  };
};
