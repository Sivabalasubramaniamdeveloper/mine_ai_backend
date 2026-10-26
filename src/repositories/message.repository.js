import supabase from "../config/supabase.js";

export const createMessage = async ({
  sessionId,
  userId,
  role,
  content,
  providerId = null,
  model = null,
  inputTokens = 0,
  outputTokens = 0,
  totalTokens = 0,
  creditsUsed = 0,
  apiKeySource = "mineai",
  apiKeyId = null,
}) => {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
      provider_id: providerId,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      credits_used: creditsUsed,
      api_key_source: apiKeySource,
      api_key_id: apiKeyId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getSessionMessages = async (userId, sessionId) => {
  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      id,
      session_id,
      user_id,
      role,
      content,
      provider_id,
      model,
      input_tokens,
      output_tokens,
      total_tokens,
      credits_used,
      api_key_source,
      api_key_id,
      created_at
    `,
    )
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
