import supabase from "../config/supabase.js";

export const createUserProfile = async (userData) => {
  const { data, error } = await supabase
    .from("users")
    .insert(userData)
    .select()
    .single();

  if (error) {
    const dbError = new Error(error.message);
    dbError.code = error.code;
    dbError.details = error.details;

    throw dbError;
  }

  return data;
};

export const deleteUserProfile = async (userId) => {
  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const getUserProfileById = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    const dbError = new Error(error.message);

    dbError.code = error.code;
    dbError.details = error.details;

    throw dbError;
  }

  return data;
};

export const updateUserProfile = async (userId, userData) => {
  const { data, error } = await supabase
    .from("users")
    .update(userData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    const dbError = new Error(error.message);

    dbError.code = error.code;
    dbError.details = error.details;

    throw dbError;
  }

  return data;
};