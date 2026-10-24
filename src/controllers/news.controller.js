import * as newsScraperService from "../services/newsScraper.service.js";

export const getCityNews = async (req, res, next) => {
  try {
    const city = req.query.city || "Chennai";
    const provider = req.query.provider;
    const articles = await newsScraperService.scrapeCityNews(city, provider);

    return res.status(200).json({
      success: true,
      message: `News for ${city} fetched successfully`,
      data: {
        city,
        provider: provider || "all",
        total: articles.length,
        articles,
      },
    });
  } catch (error) {
    next(error);
  }
};
