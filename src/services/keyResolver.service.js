import supabase from "../config/supabase.js";
import env from "../config/env.js";
import { decrypt } from "../utils/encryption.js";

const getMineAiKey = (providerName) => {
  switch (providerName) {
    case "gemini":
      return env.mineAiGeminiApiKey;

    case "openai":
      return env.mineAiOpenAiApiKey;

    case "anthropic":
      return env.mineAiAnthropicApiKey;

    default:
      return null;
  }
};

const getProvider = async ({ providerId, providerName }) => {
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

const getUserApiKey = async (userId, apiKeyId, providerId) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select(
      `
      id,
      user_id,
      provider_id,
      key_name,
      encrypted_key,
      key_last_four,
      is_active
    `,
    )
    .eq("id", apiKeyId)
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const error = new Error("Selected API key was not found");
    error.statusCode = 404;
    throw error;
  }

  if (!data.is_active) {
    const error = new Error("Selected API key is inactive");
    error.statusCode = 400;
    throw error;
  }

  return data;
};

/**
 * Finds the latest active user API key for the given provider.
 */
const getActiveUserApiKeyForProvider = async (userId, providerId) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select(
      `
      id,
      user_id,
      provider_id,
      key_name,
      encrypted_key,
      key_last_four,
      is_active
    `,
    )
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
};

export const resolveApiKey = async ({
  userId,
  providerId = null,
  providerName = null,
  apiKeyId = null,
}) => {
  const provider = await getProvider({ providerId, providerName });

  /*
   * 1. EXPLICIT USER API KEY
   *
   * If Flutter explicitly sends an apiKeyId, we use that key.
   */
  if (apiKeyId) {
    const userApiKey = await getUserApiKey(userId, apiKeyId, provider.id);

    try {
      const decryptedKey = decrypt(userApiKey.encrypted_key);
      return {
        apiKey: decryptedKey,
        source: "user",
        label: userApiKey.key_name || `User ${provider.display_name} Key`,
        apiKeyId: userApiKey.id,
        provider: {
          id: provider.id,
          name: provider.name,
          displayName: provider.display_name,
        },
      };
    } catch {
      const decryptError = new Error("Unable to decrypt the selected API key");
      decryptError.statusCode = 500;
      throw decryptError;
    }
  }

  /*
   * 2. AUTOMATIC USER API KEY LOOKUP
   *
   * If user has configured their own active API key for this provider,
   * automatically use it!
   */
  if (userId) {
    const activeUserKey = await getActiveUserApiKeyForProvider(userId, provider.id);
    if (activeUserKey) {
      try {
        const decryptedKey = decrypt(activeUserKey.encrypted_key);
        return {
          apiKey: decryptedKey,
          source: "user",
          label: activeUserKey.key_name || `User ${provider.display_name} Key`,
          apiKeyId: activeUserKey.id,
          provider: {
            id: provider.id,
            name: provider.name,
            displayName: provider.display_name,
          },
        };
      } catch (err) {
        console.warn("[KeyResolver] Failed to decrypt user key, falling back to default:", err.message);
      }
    }
  }

  /*
   * 3. MINEAI DEFAULT API KEY
   *
   * No user key was selected or found. Fall back to MineAI platform key.
   */
  const mineAiKey = getMineAiKey(provider.name);

  if (!mineAiKey) {
    const error = new Error(
      `MineAI API key is not configured for ${provider.display_name}`,
    );
    error.statusCode = 503;
    throw error;
  }

  return {
    apiKey: mineAiKey,
    source: "mineai",
    label: "MineAI API",
    apiKeyId: null,
    provider: {
      id: provider.id,
      name: provider.name,
      displayName: provider.display_name,
    },
  };
};
