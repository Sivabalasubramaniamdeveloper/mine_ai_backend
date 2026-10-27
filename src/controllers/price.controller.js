import { comparePrices } from "../services/priceComparison.service.js";

export const getPriceComparison = async (req, res, next) => {
  try {
    const { q: query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Search query parameter 'q' is required (e.g., /compare?q=iPhone 15)",
      });
    }

    const result = await comparePrices(query.trim());

    return res.status(200).json({
      success: true,
      message: "Price comparison fetched successfully",
      data: {
        ...result,
        quota: req.priceQuota || {
          limit: 5,
          used: 1,
          remaining: 4,
          plan: "Basic",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
