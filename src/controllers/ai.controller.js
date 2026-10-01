import * as aiService from "../services/ai.service.js";

export const chat = async (req, res, next) => {
  try {
    const result = await aiService.chat({
      userId: req.user.id,
      sessionId: req.body.session_id ?? null,
      provider: req.body.provider,
      model: req.body.model,
      message: req.body.message,
      apiKeyId: req.body.api_key_id ?? null,
    });

    return res.status(200).json({
      success: true,
      message: "AI response generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
