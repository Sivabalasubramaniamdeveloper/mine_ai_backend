import * as apiKeyService from "../services/apiKey.service.js";

export const listProviders = async (_req, res, next) => {
  try {
    const providers = await apiKeyService.getProviders();

    return res.status(200).json({
      success: true,
      message: "AI providers fetched successfully",
      data: {
        providers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addApiKey = async (req, res, next) => {
  try {
    const apiKey = await apiKeyService.addApiKey(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "API key added successfully",
      data: {
        apiKey,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listApiKeys = async (req, res, next) => {
  try {
    const apiKeys = await apiKeyService.listApiKeys(req.user.id);

    return res.status(200).json({
      success: true,
      message: "API keys fetched successfully",
      data: {
        apiKeys,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeApiKey = async (req, res, next) => {
  try {
    await apiKeyService.removeApiKey(req.user.id, req.params.keyId);

    return res.status(200).json({
      success: true,
      message: "API key removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateApiKey = async (req, res, next) => {
  try {
    const apiKey = await apiKeyService.updateApiKey(
      req.user.id,
      req.params.keyId,
      req.body.is_active,
    );

    return res.status(200).json({
      success: true,
      message: "API key status updated successfully",
      data: {
        apiKey,
      },
    });
  } catch (error) {
    next(error);
  }
};
