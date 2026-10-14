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
    let friendlyMessage = "Gemini request failed. Please try again later.";
    let statusCode = error?.status || 502;
    let errorCode = "GEMINI_REQUEST_FAILED";

    // Check for 503 / High Demand / Unavailable
    if (
      rawMessage.includes("503") ||
      rawMessage.includes("high demand") ||
      rawMessage.includes("UNAVAILABLE")
    ) {
      friendlyMessage =
        "The AI model is currently experiencing high demand. Please try again in a few moments.";
      statusCode = 503;
      errorCode = "MODEL_OVERLOADED";
    } else if (
      rawMessage.includes("API_KEY_INVALID") ||
      rawMessage.includes("API key not valid")
    ) {
      friendlyMessage =
        "The Gemini API key is invalid. Please check your API key and try again.";
      statusCode = 401;
      errorCode = "API_KEY_INVALID";
    } else if (
      rawMessage.includes("quota") ||
      rawMessage.includes("RESOURCE_EXHAUSTED")
    ) {
      friendlyMessage =
        "The Gemini API quota has been exceeded. Please check your usage or try again later.";
      statusCode = 429;
      errorCode = "QUOTA_EXCEEDED";
    } else if (
      rawMessage.includes("not found") ||
      rawMessage.includes("NOT_FOUND")
    ) {
      friendlyMessage =
        "The requested Gemini model was not found or is not available.";
      statusCode = 400;
      errorCode = "MODEL_NOT_FOUND";
    }

    const providerError = new Error(friendlyMessage);
    providerError.statusCode = statusCode;
    providerError.code = errorCode;
    providerError.provider = "gemini";

    throw providerError;
  }
};
