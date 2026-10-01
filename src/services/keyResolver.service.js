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

const getProvider = async (providerId) => {
  const { data, error } = await supabase
    .from("ai_providers")
    .select("id, name, display_name, is_active")
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

export const resolveApiKey = async ({
  userId,
  providerId,
  apiKeyId = null,
}) => {
  const provider = await getProvider(providerId);

  /*
   * USER API KEY
   *
   * If Flutter explicitly sends an apiKeyId,
   * we use that key.
   */
  if (apiKeyId) {
    const userApiKey = await getUserApiKey(userId, apiKeyId, provider.id);

    let decryptedKey;

    try {
      decryptedKey = decrypt(userApiKey.encrypted_key);
    } catch (error) {
      const decryptError = new Error("Unable to decrypt the selected API key");

      decryptError.statusCode = 500;

      throw decryptError;
    }

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
  }

  /*
   * MINEAI API KEY
   *
   * No user key was selected.
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
