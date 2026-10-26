import { scrapeCurrentConditions } from "../services/weatherScraper.service.js";

export const getWeatherData = async (req, res, next) => {
  try {
    const { state = "tamil-nadu", city = "chennai", day = "today" } = req.query;

    const weatherData = await scrapeCurrentConditions({
      state,
      city,

      day,
    });

    return res.status(200).json({
      success: true,
      message: "Weather data fetched successfully",
      data: weatherData,
    });
  } catch (error) {
    next(error);
  }
};
