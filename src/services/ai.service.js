import {
  createChatSession,
  getChatSessionById,
  updateChatSession,
} from "../repositories/chat.repository.js";

import {
  createMessage,
  getSessionMessages,
} from "../repositories/message.repository.js";

import { resolveApiKey } from "./keyResolver.service.js";
import { consumeCredits } from "./credit.service.js";

import { generateGeminiResponse } from "../providers/gemini.provider.js";

import supabase from "../config/supabase.js";

const getProviderId = async (providerName) => {
  const { data, error } = await supabase
    .from("ai_providers")
    .select("id, name, display_name")
    .eq("name", providerName)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const providerError = new Error("AI provider not found");

    providerError.statusCode = 404;

    throw providerError;
  }

  return data;
};

const createUsageLog = async ({
  userId,
  providerId,
  model,
  inputTokens,
  outputTokens,
  totalTokens,
  creditsUsed,
  responseTimeMs,
  status,
  errorMessage = null,
  apiKeySource,
  apiKeyId,
}) => {
  const { error } = await supabase.from("usage_logs").insert({
    user_id: userId,
    provider_id: providerId,
    model,
    request_type: "chat",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    credits_used: creditsUsed,
    response_time_ms: responseTimeMs,
    status,
    error_message: errorMessage,
    api_key_source: apiKeySource,
    api_key_id: apiKeyId,
  });

  if (error) {
    console.error("Usage log failed:", error.message);
  }
};

export const chat = async ({
  userId,
  sessionId = null,
  provider,
  model,
  message,
  apiKeyId = null,
}) => {
  const startedAt = Date.now();

  // Enforce and consume credits
  const creditStatus = await consumeCredits({
    userId,
    amount: 10,
    actionType: "chat",
  });

  /*
   * 1. Resolve provider
   */

  const providerData = await getProviderId(provider);

  /*
   * 2. Resolve API key
   */

  const keyData = await resolveApiKey({
    userId,
    providerId: providerData.id,
    apiKeyId,
  });

  /*
   * 3. Get or create chat session
   */

  let session;

  if (sessionId) {
    session = await getChatSessionById(userId, sessionId);

    if (!session) {
      const error = new Error("Chat session not found");

      error.statusCode = 404;

      throw error;
    }
  } else {
    session = await createChatSession({
      userId,
      providerId: providerData.id,
      model,
      title: message.substring(0, 100),
    });
  }

  /*
   * 4. Load previous messages
   */

  const previousMessages = await getSessionMessages(userId, session.id);

  /*
   * 5. Prepare Gemini conversation
   */

  const aiMessages = previousMessages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role,
      content: item.content,
    }));

  aiMessages.push({
    role: "user",
    content: message,
  });

  /*
   * 6. Call provider
   */

  let aiResponse;

  try {
    if (providerData.name === "gemini") {
      aiResponse = await generateGeminiResponse({
        apiKey: keyData.apiKey,
        model,
        messages: aiMessages,
      });
    } else {
      const error = new Error(
        `Provider "${providerData.name}" is not implemented yet`,
      );

      error.statusCode = 501;

      throw error;
    }
  } catch (error) {
    await createUsageLog({
      userId,
      providerId: providerData.id,
      model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      creditsUsed: 0,
      responseTimeMs: Date.now() - startedAt,
      status: "failed",
      errorMessage: error.message,
      apiKeySource: keyData.source,
      apiKeyId: keyData.apiKeyId,
    });

    throw error;
  }

  /*
   * 7. Save user message
   */

  await createMessage({
    sessionId: session.id,
    userId,
    role: "user",
    content: message,
    providerId: providerData.id,
    model,
    apiKeySource: keyData.source,
    apiKeyId: keyData.apiKeyId,
  });

  /*
   * 8. Save assistant message
   */

  const assistantMessage = await createMessage({
    sessionId: session.id,
    userId,
    role: "assistant",
    content: aiResponse.text,
    providerId: providerData.id,
    model,
    inputTokens: aiResponse.inputTokens,
    outputTokens: aiResponse.outputTokens,
    totalTokens: aiResponse.totalTokens,
    apiKeySource: keyData.source,
    apiKeyId: keyData.apiKeyId,
  });

  /*
   * 9. Update session
   */

  await updateChatSession(userId, session.id, {
    provider_id: providerData.id,
    model,
  });

  /*
   * 10. Usage log
   *
   * Credits will be calculated properly
   * when we implement the credit service.
   */

  const responseTimeMs = Date.now() - startedAt;

  await createUsageLog({
    userId,
    providerId: providerData.id,
    model,
    inputTokens: aiResponse.inputTokens,
    outputTokens: aiResponse.outputTokens,
    totalTokens: aiResponse.totalTokens,
    creditsUsed: 10,
    responseTimeMs,
    status: "success",
    apiKeySource: keyData.source,
    apiKeyId: keyData.apiKeyId,
  });

  /*
   * 11. Return safe response
   *
   * NEVER return keyData.apiKey
   */

  return {
    session_id: session.id,
    credits_left: creditStatus.creditsLeft,

    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: assistantMessage.content,
      created_at: assistantMessage.created_at,
    },

    provider: providerData.name,

    model,

    api_key_source: keyData.source,

    api_key_label: keyData.label,

    usage: {
      input_tokens: aiResponse.inputTokens,
      output_tokens: aiResponse.outputTokens,
      total_tokens: aiResponse.totalTokens,
    },
  };
};
