import { searchAllStores } from "../services/multiStoreScraper.service.js";

export const getAggregatedProducts = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20, store = "all" } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query 'q' parameter is required. Example: ?q=smartwatch",
      });
    }

    const data = await searchAllStores({
      query: query.trim(),
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      store,
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data,
      quota: req.scrapeQuota || {
        limit: 2,
        used: 1,
        remaining: 1,
        plan: "Basic",
      },
    });
  } catch (error) {
    next(error);
  }
};