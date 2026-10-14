import supabase from "../config/supabase.js";

export const createApiKey = async (apiKeyData) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .insert(apiKeyData)
    .select(
      `
      id,
      user_id,
      provider_id,
      key_name,
      key_last_four,
      is_active,
      last_used_at,
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) {
    const dbError = new Error(error.message);

    dbError.code = error.code;
    dbError.details = error.details;

    throw dbError;
  }

  return data;
};

export const getUserApiKeys = async (userId) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select(
      `
      id,
      user_id,
      provider_id,
      key_name,
      key_last_four,
      is_active,
      last_used_at,
      created_at,
      updated_at,
      ai_providers (
        id,
        name,
        display_name
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getApiKeyById = async (userId, keyId) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("*")
    .eq("id", keyId)
    .eq("user_id", userId)
    .single();

  if (error) {
    const dbError = new Error(error.message);

    dbError.code = error.code;
    dbError.details = error.details;

    throw dbError;
  }

  return data;
};

export const deleteApiKey = async (userId, keyId) => {
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateApiKeyStatus = async (userId, keyId, isActive) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", keyId)
    .eq("user_id", userId)
    .select(
      `
      id,
      user_id,
      provider_id,
      key_name,
      key_last_four,
      is_active,
      last_used_at,
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) {
    const dbError = new Error(error.message);

    dbError.code = error.code;
    dbError.details = error.details;

    throw dbError;
  }

  return data;
};
