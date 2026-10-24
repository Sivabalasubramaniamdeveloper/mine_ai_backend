import { chromium } from "playwright";

export const buildWeatherUrl = ({
  state = "tamil-nadu",
  city = "chennai",
  day = "today",
}) => {
  const stateSlug = formatSlug(state);
  const citySlug = formatSlug(city);

  return `https://weather.com/en-IN/in/${stateSlug}/city/${citySlug}/today`;
};
const formatSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export const scrapeCurrentConditions = async ({
  state = "tamil-nadu",
  city = "chennai",
  day = "today",
}) => {
  const browser = await chromium.launch({
    headless: true,
  });
  const targetUrl = buildWeatherUrl({ state, city, day });
  console.log(targetUrl);
  try {
    const context = await browser.newContext({
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
      viewport: {
        width: 1440,
        height: 1200,
      },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    console.log("Opening weather.com...");

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Allow client-side JavaScript to finish rendering.
    await page.waitForTimeout(5000);

    const bodyText = await page.locator("body").innerText();

    console.log("Weather page loaded successfully.");

    // ---------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------

    const clean = (value) => {
      if (!value) return null;

      return value
        .replace(/\s+/g, " ")
        .replace(/\u00a0/g, " ")
        .trim();
    };

    const toTemperature = (value) => {
      if (!value) return null;

      const match = value.match(/(\d+(?:\.\d+)?)\s*°/);

      return match ? `${match[1]}°` : null;
    };

    // ---------------------------------------------------------
    // CURRENT WEATHER
    // ---------------------------------------------------------

    /*
     * Based on the rendered Weather.com page:
     *
     * Now
     * 89°
     * 88°
     * 87°
     *
     * Clear
     * Feels Like
     * 101°
     *
     * High
     * 96°
     *
     * Low
     * 82°
     */

    let temp = null;

    const currentTemperatureMatch = bodyText.match(
      /Today[\s\S]*?Now\s+(\d+(?:\.\d+)?)°/,
    );

    if (currentTemperatureMatch) {
      temp = `${currentTemperatureMatch[1]}°`;
    }

    // More reliable fallback:
    if (!temp) {
      const nowTemperatureMatch = bodyText.match(/\bNow\s+(\d+(?:\.\d+)?)°/);

      if (nowTemperatureMatch) {
        temp = `${nowTemperatureMatch[1]}°`;
      }
    }

    // ---------------------------------------------------------
    // CONDITION
    // ---------------------------------------------------------

    let condition = null;

    const conditionMatch = bodyText.match(
      /\bNow\s+\d+(?:\.\d+)?°[\s\S]{0,100}?\n(.*?)\n\nFeels Like/i,
    );

    if (conditionMatch) {
      condition = clean(conditionMatch[1]);
    }

    // Fallback condition detection
    if (!condition) {
      const conditions = [
        "Scattered Thunderstorms",
        "Thunderstorms",
        "Light Rain",
        "Heavy Rain",
        "Showers",
        "Rain",
        "Drizzle",
        "Partly Cloudy",
        "Mostly Cloudy",
        "Cloudy",
        "Mostly Sunny",
        "Sunny",
        "Clear Sky",
        "Clear",
        "Haze",
        "Mist",
        "Fog",
        "Fair",
      ];

      for (const weatherCondition of conditions) {
        if (new RegExp(`\\b${weatherCondition}\\b`, "i").test(bodyText)) {
          condition = weatherCondition;
          break;
        }
      }
    }

    // ---------------------------------------------------------
    // FEELS LIKE
    // ---------------------------------------------------------

    let feelsLike = null;

    const feelsLikeMatch = bodyText.match(/Feels Like\s+(\d+(?:\.\d+)?)°/i);

    if (feelsLikeMatch) {
      feelsLike = `${feelsLikeMatch[1]}°`;
    }

    // ---------------------------------------------------------
    // HIGH
    // ---------------------------------------------------------

    let high = null;

    const highMatch = bodyText.match(/High\s+(\d+(?:\.\d+)?)°/i);

    if (highMatch) {
      high = `${highMatch[1]}°`;
    }

    // ---------------------------------------------------------
    // LOW
    // ---------------------------------------------------------

    let low = null;

    const lowMatch = bodyText.match(/Low\s+(\d+(?:\.\d+)?)°/i);

    if (lowMatch) {
      low = `${lowMatch[1]}°`;
    }

    // ---------------------------------------------------------
    // CHANCE OF RAIN
    // ---------------------------------------------------------

    let chanceOfRain = null;

    const rainMatch = bodyText.match(/Chance of Rain\s+(\d+(?:\.\d+)?)%/i);

    if (rainMatch) {
      chanceOfRain = `${rainMatch[1]}%`;
    }

    // ---------------------------------------------------------
    // WIND
    // ---------------------------------------------------------

    let wind = null;

    const windMatch = bodyText.match(/Wind\s+(\d+(?:\.\d+)?)\s*(mph|km\/h)/i);

    if (windMatch) {
      let windValue = parseFloat(windMatch[1]);

      const unit = windMatch[2].toLowerCase();

      if (unit === "mph") {
        windValue = windValue * 1.60934;
      }

      wind = Math.round(windValue).toString();
    }

    // ---------------------------------------------------------
    // HUMIDITY
    // ---------------------------------------------------------

    let humidity = null;

    const humidityMatch = bodyText.match(/Humidity\s+(\d+(?:\.\d+)?)%/i);

    if (humidityMatch) {
      humidity = humidityMatch[1];
    }

    // ---------------------------------------------------------
    // UV INDEX
    // ---------------------------------------------------------

    let uv = null;

    const uvMatch = bodyText.match(/UV Index\s+(\d+(?:\.\d+)?)\s+of\s+\d+/i);

    if (uvMatch) {
      uv = uvMatch[1];
    }

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    console.log("\n========== SCRAPED WEATHER ==========");
    console.log("Temperature:", temp);
    console.log("Condition:", condition);
    console.log("High:", high);
    console.log("Low:", low);
    console.log("Feels Like:", feelsLike);
    console.log("Chance of Rain:", chanceOfRain);
    console.log("Wind:", wind, "km/h");
    console.log("Humidity:", humidity, "%");
    console.log("UV:", uv);
    console.log("======================================\n");

    if (!temp) {
      throw new Error("Could not extract current temperature from weather.com");
    }

    if (!condition) {
      throw new Error(
        "Could not extract current weather condition from weather.com",
      );
    }

    // ---------------------------------------------------------
    // AI SUGGESTION
    // ---------------------------------------------------------

    const numericTemp = parseFloat(temp.replace(/[^\d.]/g, "")) || 30;

    let aiSuggestion =
      "Clear skies expected. Ideal conditions for outdoor work and tasks before sunset.";

    const lowerCondition = condition.toLowerCase();

    if (
      lowerCondition.includes("rain") ||
      lowerCondition.includes("shower") ||
      lowerCondition.includes("storm")
    ) {
      aiSuggestion =
        "Rain expected today. Keep an umbrella handy and plan for indoor sessions.";
    } else if (numericTemp >= 35) {
      aiSuggestion =
        "High temperatures detected. Stay hydrated and schedule strenuous outdoor activities for early morning or evening.";
    } else if (numericTemp >= 32) {
      aiSuggestion =
        "Warm conditions today. Stay hydrated and avoid prolonged outdoor activity during the hottest part of the day.";
    }

    // ---------------------------------------------------------
    // FORECAST
    // ---------------------------------------------------------

    const forecast = [];

    /*
     * Weather.com currently renders:
     *
     * Chennai Daily Forecast
     * Tonight
     * 5%
     * Mostly Clear
     * 82°
     * 96°
     *
     * Wed 07
     * 12%
     * Partly Cloudy
     * 82°
     * 93°
     */

    const forecastRegex =
      /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(\d+)%\s+([^\n]+)\s+(\d+)°\s+(\d+)°/g;

    let match;

    while ((match = forecastRegex.exec(bodyText)) !== null) {
      forecast.push({
        day: match[1],
        high: `${match[6]}°`,
        low: `${match[5]}°`,
        condition: clean(match[4]),
      });
    }

    // If today's current day is not included in the weekly forecast,
    // add the current day's high/low as the first forecast item.
    if (forecast.length < 4 && high && low) {
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "Asia/Kolkata",
      });

      const alreadyExists = forecast.some((item) => item.day === today);

      if (!alreadyExists) {
        forecast.unshift({
          day: today,
          high,
          low,
          condition,
        });
      }
    }

    // Keep only four forecast entries.
    const finalForecast = forecast.slice(0, 4);

    // ---------------------------------------------------------
    // FINAL RESPONSE
    // ---------------------------------------------------------

    return {
      location: state,
      city: city,

      updatedAt: "Updated just now",

      current: {
        temp,
        condition,
        high,
        low,
        feelsLike,
        chanceOfRain,
      },

      mindAiSuggests: aiSuggestion,
      mineAiSuggests: aiSuggestion,

      metrics: {
        wind: {
          value: wind,
          unit: "km/h",
          progress: Math.min((parseFloat(wind) || 0) / 40, 1),
        },

        humidity: {
          value: humidity,
          unit: "%",
          progress: Math.min((parseFloat(humidity) || 0) / 100, 1),
        },

        uvIndex: {
          display: `Index (${uv ?? "N/A"})`,
          status: parseFloat(uv) > 6 ? "HIGH" : "SAFE LEVEL",
        },
      },

      forecast: finalForecast,
    };
  } catch (error) {
    console.error("Weather scraping failed:", error.message);

    throw new Error(`Failed to scrape Chennai weather: ${error.message}`);
  } finally {
    await browser.close();
  }
};
