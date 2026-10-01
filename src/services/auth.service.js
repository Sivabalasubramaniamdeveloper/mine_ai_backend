import supabase from "../config/supabase.js";
import {
  createUserProfile,
  deleteUserProfile,
} from "../repositories/user.repository.js";
import {
  createUserSettings,
  deleteUserSettings,
} from "../repositories/user-settings.repository.js";
import supabaseAuth from "../config/supabase-auth.js";

export const register = async (data) => {
  const {
    email,
    password,
    username,
    full_name,
    dob,
    gender,
    country_code,
    timezone,
    language,
  } = data;

  let authUser = null;
  let profileCreated = false;
  let settingsCreated = false;

  try {
    // 1. Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      if (
        authError.message ===
        "A user with this email address has already been registered"
      ) {
        const error = new Error("Email address is already registered");
        error.statusCode = 409;
        throw error;
      }

      throw new Error(authError.message);
    }

    authUser = authData.user;

    // 2. Create application user
    const user = await createUserProfile({
      id: authUser.id,
      email: authUser.email,
      username,
      full_name,
      dob,
      gender,
      country_code,
      timezone,
      language: language || "en",
      credits: 100,
    });
    profileCreated = true;
    // ------------------------------------------------
    // 3. Create user_settings
    // ------------------------------------------------
    const settings = await createUserSettings(authUser.id);

    settingsCreated = true;
    // 3. Return result
    return {
      user,
      settings,
    };
  } catch (error) {
    console.log("Registration error:");
    console.log("Message:", error.message);
    console.log("Code:", error.code);
    console.log("Details:", error.details);
    console.log("Hint:", error.hint);
    let finalError = error;

    if (error.code === "23505") {
      const details = error.message || "";

      if (details.includes("users_email_key")) {
        finalError = new Error("Email address is already registered");
        finalError.statusCode = 409;
      } else if (details.includes("users_username_key")) {
        finalError = new Error("Username is already taken");
        finalError.statusCode = 409;
      } else {
        finalError = new Error("A unique value already exists");
        finalError.statusCode = 409;
      }
    }
    // ------------------------------------------------
    // Rollback public.users
    // ------------------------------------------------

    if (profileCreated === true && authUser?.id) {
      try {
        await deleteUserProfile(authUser.id);
      } catch (rollbackError) {
        console.error("User profile rollback failed:", rollbackError.message);
      }
    }

    // ------------------------------------------------
    // Rollback Supabase Auth user
    // ------------------------------------------------
    if (authUser?.id) {
      try {
        await supabase.auth.admin.deleteUser(authUser.id);
      } catch (rollbackError) {
        console.error("Auth rollback failed:", rollbackError.message);
      }
    }

    throw finalError;
  }
};

export const login = async (data) => {
  const { email, password } = data;

  const { data: authData, error: authError } =
    await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    const error = new Error("Invalid email or password");

    error.statusCode = 401;

    throw error;
  }

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email,
    },

    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
      expires_in: authData.session.expires_in,
    },
  };
};
