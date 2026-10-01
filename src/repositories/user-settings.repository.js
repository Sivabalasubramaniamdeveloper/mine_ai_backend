import supabase from "../config/supabase.js";

export const createUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from("user_settings")
    .insert({
      user_id: userId,
    })
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

export const deleteUserSettings = async (userId) => {
  const { error } = await supabase
    .from("user_settings")
    .delete()
    .eq("user_id", userId);

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