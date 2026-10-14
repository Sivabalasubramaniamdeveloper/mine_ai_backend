import {
  createApiKey,
  getUserApiKeys,
  getApiKeyById,
  deleteApiKey,
  updateApiKeyStatus,
} from "../repositories/apiKey.repository.js";

import supabase from "../config/supabase.js";

import { encrypt, decrypt } from "../utils/encryption.js";

const getProviderById = async (providerId) => {
  const { data, error } = await supabase
    .from("ai_providers")
    .select(
      `
      id,
      name,
      display_name,
      is_active
    `,
    )
    .eq("id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const error = new Error("AI provider not found");

    error.statusCode = 404;

    throw error;
  }

  if (!data.is_active) {
    const error = new Error("AI provider is currently inactive");

    error.statusCode = 400;

    throw error;
  }

  return data;
};

export const addApiKey = async (userId, data) => {
  const { provider_id, key_name, api_key } = data;

  // 1. Verify provider
  const provider = await getProviderById(provider_id);

  // 2. Encrypt the actual API key
  const encryptedKey = encrypt(api_key);

  // 3. Keep only last four characters
  const keyLastFour = api_key.slice(-4);

  // 4. Store encrypted key
  const savedKey = await createApiKey({
    user_id: userId,
    provider_id: provider.id,
    key_name,
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
