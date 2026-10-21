import { GoogleGenAI } from "@google/genai";

export const generateGeminiResponse = async ({ apiKey, model, messages }) => {
  if (!apiKey) {
    throw new Error("Gemini API key is required");
  }

  // Map outdated/deprecated model names to the current active Gemini model
  let targetModel = model;
  if (
    !targetModel ||
    targetModel.includes("1.5") ||
    targetModel.includes("2.0") ||
    targetModel.includes("2.5")
  ) {
    targetModel = "gemini-3.8-flash";
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
    let response;
    try {
      response = await ai.models.generateContent({
        model: targetModel,
        contents,
      });
    } catch (firstErr) {
      // If requested model wasn't found, auto-fallback to gemini-3.8-flash
      if (
        (firstErr?.message?.includes("NOT_FOUND") ||
          firstErr?.message?.includes("not found") ||
          firstErr?.message?.includes("no longer available")) &&
        targetModel !== "gemini-3.8-flash"
      ) {
        console.warn(
          `[GeminiProvider] Model ${targetModel} not found, falling back to gemini-3.8-flash`,
        );
        targetModel = "gemini-3.8-flash";
        response = await ai.models.generateContent({
          model: targetModel,
          contents,
        });
      } else {
        throw firstErr;
      }
    }

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
