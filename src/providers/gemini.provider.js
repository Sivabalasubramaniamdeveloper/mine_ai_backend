import { GoogleGenAI } from "@google/genai";

export const generateGeminiResponse = async ({ apiKey, model, messages }) => {
  if (!apiKey) {
    throw new Error("Gemini API key is required");
  }

  if (!model) {
    throw new Error("Gemini model is required");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",

    parts: [
      {
        text: message.content,
      },
    ],
  }));

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
    });

    return {
      text: response.text || "",
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    };
  } catch (error) {
    const rawMessage = error?.message || "";

    const providerError = new Error("Gemini request failed.");

    providerError.statusCode = 502;
    providerError.code = "GEMINI_REQUEST_FAILED";
    providerError.provider = "gemini";

    if (
      rawMessage.includes("API_KEY_INVALID") ||
      rawMessage.includes("API key not valid")
    ) {
      providerError.message =
        "The Gemini API key is invalid. Please check your API key and try again.";

      providerError.statusCode = 401;
      providerError.code = "API_KEY_INVALID";
    } else if (
      rawMessage.includes("quota") ||
      rawMessage.includes("RESOURCE_EXHAUSTED")
    ) {
      providerError.message =
        "The Gemini API quota has been exceeded. Please check your Gemini API usage or use another API key.";

      providerError.statusCode = 429;
      providerError.code = "QUOTA_EXCEEDED";
    } else if (
      rawMessage.includes("not found") ||
      rawMessage.includes("NOT_FOUND")
    ) {
      providerError.message =
        "The requested Gemini model was not found or is not available for this API key.";

      providerError.statusCode = 400;
      providerError.code = "MODEL_NOT_FOUND";
    } else if (
      rawMessage.includes("permission") ||
      rawMessage.includes("PERMISSION_DENIED")
    ) {
      providerError.message =
        "This Gemini API key does not have permission to use the requested model.";

      providerError.statusCode = 403;
      providerError.code = "PERMISSION_DENIED";
    }

    throw providerError;
  }
};
