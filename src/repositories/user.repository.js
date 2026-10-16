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

// Return only plan fields used by the application instead of exposing unrelated catalog data.
export const getPlanCatalog = async () => {
  const { data, error } = await supabase
    .from("plans")
    .select("id, tier_code")
    .order("tier_code");
  if (error) throw error;
  return data ?? [];
};

// Updating and selecting in one request lets the client immediately render the persisted assignment.
export const assignUserPlan = async (userId, planId) => {
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) {
    const error = new Error("Selected plan was not found");
    error.statusCode = 404;
    throw error;
  }

  const { data, error } = await supabase
    .from("users")
    .update({ plan_id: planId })
    .eq("id", userId)
    .select("id, credits, plan_id, plans(tier_code)")
    .single();
  if (error) throw error;
  return data;
};
