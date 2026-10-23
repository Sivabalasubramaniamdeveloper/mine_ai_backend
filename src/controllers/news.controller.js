import * as newsScraperService from "../services/newsScraper.service.js";

export const getCityNews = async (req, res, next) => {
  try {
    const city = req.query.city || "Chennai";
    const articles = await newsScraperService.scrapeCityNews(city);

    return res.status(200).json({
      success: true,
      message: `News for ${city} fetched successfully`,
      data: {
        city,
        total: articles.length,
        articles,
      },
    });
  } catch (error) {
    next(error);
  }
};
