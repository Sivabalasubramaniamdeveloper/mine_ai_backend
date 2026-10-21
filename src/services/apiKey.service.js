import {
  createApiKey,
  getUserApiKeys,
  getApiKeyById,
  deleteApiKey,
  updateApiKeyStatus,
} from "../repositories/apiKey.repository.js";

import supabase from "../config/supabase.js";

import { encrypt } from "../utils/encryption.js";

export const getProviders = async () => {
  const { data, error } = await supabase
    .from("ai_providers")
    .select("id, name, display_name, is_active")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

const resolveProvider = async ({ providerId, providerName }) => {
  let query = supabase.from("ai_providers").select("id, name, display_name, is_active");

  if (providerId) {
    query = query.eq("id", providerId);
  } else if (providerName) {
    query = query.eq("name", providerName);
  } else {
    query = query.eq("name", "gemini");
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const err = new Error("AI provider not found");
    err.statusCode = 404;
    throw err;
  }

  if (!data.is_active) {
    const err = new Error("AI provider is currently inactive");
    err.statusCode = 400;
    throw err;
  }

  return data;
};

export const addApiKey = async (userId, data) => {
  const { provider_id, provider_name, key_name, api_key } = data;

  // 1. Verify and resolve provider (by id or name)
  const provider = await resolveProvider({
    providerId: provider_id,
    providerName: provider_name,
  });

  // 2. Encrypt the actual API key or password
  const encryptedKey = encrypt(api_key.trim());

  // 3. Keep only last four characters
  const cleanKey = api_key.replace(/\s+/g, "");
  const keyLastFour = cleanKey.slice(-4);

  // 4. Store encrypted key
  const savedKey = await createApiKey({
    user_id: userId,
    provider_id: provider.id,
    key_name: key_name || `${provider.display_name} Key`,
    encrypted_key: encryptedKey,
    key_last_four: keyLastFour,
    is_active: true,
  });

  // 5. Never return encrypted_key
  return {
    id: savedKey.id,
    provider: {
      id: provider.id,
      name: provider.name,
      display_name: provider.display_name,
    },
    key_name: savedKey.key_name,
    key_last_four: savedKey.key_last_four,
    is_active: savedKey.is_active,
    created_at: savedKey.created_at,
  };
};

export const listApiKeys = async (userId) => {
  const apiKeys = await getUserApiKeys(userId);

  return apiKeys.map((item) => ({
    id: item.id,
    provider: item.ai_providers,
    key_name: item.key_name,
    key_last_four: item.key_last_four,
    is_active: item.is_active,
    last_used_at: item.last_used_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
};

export const removeApiKey = async (userId, keyId) => {
  // Make sure the key belongs to this user
  await getApiKeyById(userId, keyId);

  await deleteApiKey(userId, keyId);
};

export const updateApiKey = async (userId, keyId, isActive) => {
  // Make sure the key belongs to this user
  await getApiKeyById(userId, keyId);

  const updatedKey = await updateApiKeyStatus(userId, keyId, isActive);

  return {
    id: updatedKey.id,
    provider_id: updatedKey.provider_id,
    key_name: updatedKey.key_name,
    key_last_four: updatedKey.key_last_four,
    is_active: updatedKey.is_active,
    last_used_at: updatedKey.last_used_at,
    updated_at: updatedKey.updated_at,
  };
};
