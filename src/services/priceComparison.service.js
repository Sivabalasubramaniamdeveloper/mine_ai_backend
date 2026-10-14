import axios from "axios";
import * as cheerio from "cheerio";

// -----------------------------------------------------------------
// Request Headers
// -----------------------------------------------------------------
const AMAZON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

const FLIPKART_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

// -----------------------------------------------------------------
// Helpers: Clean Query & Numeric Price
// -----------------------------------------------------------------
export const cleanSearchQuery = (rawQuery) => {
  let q = rawQuery.toLowerCase().trim();

  const commonBrands = [
    "samsung",
    "apple",
    "redmi",
    "xiaomi",
    "realme",
    "oneplus",
    "motorola",
    "google",
    "vivo",
    "oppo",
    "poco",
    "iqoo",
    "sony",
  ];

  for (const brand of commonBrands) {
    if (q.startsWith(brand) && q.length > brand.length) {
      q = `${brand} ${q.slice(brand.length).trim()}`;
      break;
    }
  }

  q = q
    .replace(/([0-9]+)([a-zA-Z]+)/g, "$1 $2")
    .replace(/([a-zA-Z]+)([0-9]+)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return q;
};

const parseNumericPrice = (rawPrice) => {
  if (!rawPrice) return null;
  const cleaned = rawPrice.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
};

const calculateRelevanceScore = (title, query) => {
  const cleanTitle = title.toLowerCase();
  const searchTokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  let score = 0;
  for (const token of searchTokens) {
    const regex = new RegExp(`\\b${token}\\b`, "i");
    if (regex.test(cleanTitle)) {
      score += 2;
    } else if (cleanTitle.includes(token)) {
      score += 1;
    } else {
      if (/\d+/.test(token)) {
        score -= 5;
      }
    }
  }
  return score;
};

// -----------------------------------------------------------------
// 1. Amazon India (Accurate Model Scoring & Fallbacks)
// -----------------------------------------------------------------
// export const scrapeAmazonPrice = async (rawQuery) => {
//   const query = cleanSearchQuery(rawQuery);
//   const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;

//   try {
  
//  const { data: html } = await axios.get(searchUrl, {
//       headers: AMAZON_HEADERS,
//       timeout: 10000,
//     });
    
   

//     const $ = cheerio.load(html);
//     const candidates = [];

//     $('[data-component-type="s-search-result"]').each((_, el) => {
//       const isSponsored =
//         $(el).find(".puis-sponsored-label-text, .s-sponsored-label-text")
//           .length > 0;

//       const titleCandidate =
//         $(el).find("h2 a span").first().text().trim() ||
//         $(el).find("h2 span").first().text().trim();

//       const priceCandidate =
//         $(el).find(".a-price .a-offscreen").first().text().trim() ||
//         $(el).find(".a-price-whole").first().text().trim();

//       const hrefCandidate = $(el).find("h2 a").attr("href");
//       const imgCandidate = $(el).find(".s-image").attr("src");
//       const ratingCandidate = $(el).find(".a-icon-alt").first().text().trim();

//       const parsedPrice = parseNumericPrice(priceCandidate);

//       if (titleCandidate && parsedPrice && parsedPrice > 100) {
//         const relevance = calculateRelevanceScore(titleCandidate, query);

//         candidates.push({
//           title: titleCandidate,
//           price: parsedPrice,
//           link: hrefCandidate
//             ? hrefCandidate.startsWith("http")
//               ? hrefCandidate
//               : `https://www.amazon.in${hrefCandidate}`
//             : searchUrl,
//           image: imgCandidate || null,
//           rating: ratingCandidate ? ratingCandidate.split(" ")[0] : null,
//           isSponsored,
//           relevance,
//         });
//       }
//     });

//     candidates.sort((a, b) => {
//       if (a.isSponsored !== b.isSponsored) {
//         return a.isSponsored ? 1 : -1;
//       }
//       return b.relevance - a.relevance;
//     });

//     const bestCandidate = candidates.length > 0 ? candidates[0] : null;

//     return {
//       store: "Amazon",
//       found: bestCandidate !== null,
//       title: bestCandidate ? bestCandidate.title : query,
//       price: bestCandidate ? bestCandidate.price : null,
//       currency: "INR",
//       formattedPrice: bestCandidate
//         ? `₹${bestCandidate.price.toLocaleString("en-IN")}`
//         : "Unavailable",
//       rating: bestCandidate ? bestCandidate.rating : null,
//       productUrl: bestCandidate ? bestCandidate.link : searchUrl,
//       imageUrl: bestCandidate ? bestCandidate.image : null,
//     };
//   } catch (err) {
//     console.error("Amazon Scraping Error:", err.message);
//     return {
//       store: "Amazon",
//       found: false,
//       title: query,
//       price: null,
//       currency: "INR",
//       formattedPrice: "Unavailable",
//       rating: null,
//       productUrl: searchUrl,
//       imageUrl: null,
//     };
//   }
// };
export const scrapeAmazonPrice = async (rawQuery) => {
  const query = cleanSearchQuery(rawQuery);
  const targetAmazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;

  try {
    let html;

    // Use ScrapingAnt if the API key is present (production on Railway)
    if (process.env.SCRAPINGANT_API_KEY) {
      const response = await axios.get("https://api.scrapingant.com/v2/general", {
        params: {
          "x-api-key": process.env.SCRAPINGANT_API_KEY,
          url: targetAmazonUrl,
          browser: "false", // set to "true" only if HTML is empty
          proxy_country: "IN", // Route via Indian IP for Amazon India prices
        },
        timeout: 25000,
      });
      html = response.data;
    } else {
      // Local fallback using direct request
      const response = await axios.get(targetAmazonUrl, {
        headers: AMAZON_HEADERS,
        timeout: 10000,
      });
      html = response.data;
    }

    const $ = cheerio.load(html);
    const candidates = [];

    $('[data-component-type="s-search-result"], .s-result-item[data-asin]').each((_, el) => {
      const asin = $(el).attr("data-asin");
      if (!asin || asin.trim() === "") return;

      const isSponsored =
        $(el).find(".puis-sponsored-label-text, .s-sponsored-label-text").length > 0;

      const title =
        $(el).find("h2 a span").first().text().trim() ||
        $(el).find("h2 span").first().text().trim();

      const priceText =
        $(el).find(".a-price .a-offscreen").first().text().trim() ||
        $(el).find(".a-price-whole").first().text().trim();

      const href = $(el).find("h2 a").attr("href");
      const img = $(el).find(".s-image").attr("src");
      const parsedPrice = parseNumericPrice(priceText);

      if (title && parsedPrice && parsedPrice > 100) {
        candidates.push({
          title,
          price: parsedPrice,
          link: href ? (href.startsWith("http") ? href : `https://www.amazon.in${href}`) : targetAmazonUrl,
          image: img || null,
          isSponsored,
          relevance: calculateRelevanceScore(title, query, parsedPrice),
        });
      }
    });

    candidates.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return (a.isSponsored ? 1 : 0) - (b.isSponsored ? 1 : 0);
    });

    const bestCandidate = candidates.length > 0 ? candidates[0] : null;

    return {
      store: "Amazon",
      found: bestCandidate !== null && bestCandidate.relevance > -20,
      title: bestCandidate ? bestCandidate.title : query,
      price: bestCandidate ? bestCandidate.price : null,
      currency: "INR",
      formattedPrice: bestCandidate
        ? `₹${bestCandidate.price.toLocaleString("en-IN")}`
        : "Unavailable",
      productUrl: bestCandidate ? bestCandidate.link : targetAmazonUrl,
      imageUrl: bestCandidate ? bestCandidate.image : null,
    };
  } catch (err) {
    console.error("ScrapingAnt Amazon Error:", err.response?.data || err.message);
    return {
      store: "Amazon",
      found: false,
      title: query,
      price: null,
      currency: "INR",
      formattedPrice: "Unavailable",
      productUrl: targetAmazonUrl,
      imageUrl: null,
    };
  }
};
// -----------------------------------------------------------------
// 2. Flipkart (Restored Previous Working Parsing Logic)
// -----------------------------------------------------------------
export const scrapeFlipkartPrice = async (rawQuery) => {
  const query = cleanSearchQuery(rawQuery);
  const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;

  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: FLIPKART_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(html);
    let title = null;
    let price = null;
    let link = null;
    let image = null;
    let rating = null;

    // Strategy 1: Targeted card containers (Single & Grid cards)
    $("div._75nlfW, div.tUxRFH, div[data-id], div._1AtVbE").each((_, el) => {
      if (price) return;

      const titleCandidate =
        $(el)
          .find(".KzDlHZ, .wBy4fm, ._4rR01T, .s1Q9rs")
          .first()
          .text()
          .trim() || $(el).find("img").attr("alt");

      const priceText = $(el).find(".Nx9bqj, ._30jeq3").first().text().trim();
      const parsedPrice = parseNumericPrice(priceText);
      const relativeLink = $(el)
        .find("a.CGtC5Q, a._1fQZEK, a[href*='/p/'], a")
        .first()
        .attr("href");
      const imgCandidate = $(el)
        .find("img.DByuf4, img._396cs4, img")
        .first()
        .attr("src");
      const ratingText = $(el).find(".XQDdHH, ._3LWZlK").first().text().trim();

      if (parsedPrice && parsedPrice > 100 && titleCandidate) {
        title = titleCandidate;
        price = parsedPrice;
        link = relativeLink
          ? relativeLink.startsWith("http")
            ? relativeLink
            : `https://www.flipkart.com${relativeLink}`
          : searchUrl;
        image = imgCandidate || null;
        rating = ratingText || null;
      }
    });

    // Strategy 2: Previous working fallback using "₹" selector
    if (!price) {
      $('div:contains("₹")').each((_, el) => {
        if (price) return;

        const text = $(el).text().trim();
        const match = text.match(/₹\s*([0-9,]+)/);
        if (match && match[1]) {
          const potentialPrice = parseNumericPrice(match[1]);
          const card = $(el).closest("a, div[data-id]");

          if (card.length && potentialPrice && potentialPrice > 100) {
            const cardTitle =
              card.find("img").attr("alt") ||
              card
                .find("div.KzDlHZ, a.wBy4fm, .s1Q9rs, ._4rR01T")
                .text()
                .trim();
            const cardImg = card.find("img").attr("src");
            const cardLink = card.is("a")
              ? card.attr("href")
              : card.find("a").attr("href");

            price = potentialPrice;
            title = cardTitle || query;
            image = cardImg || null;
            link = cardLink
              ? cardLink.startsWith("http")
                ? cardLink
                : `https://www.flipkart.com${cardLink}`
              : searchUrl;
          }
        }
      });
    }

    return {
      store: "Flipkart",
      found: price !== null,
      title: title || query,
      price: price,
      currency: "INR",
      formattedPrice: price
        ? `₹${price.toLocaleString("en-IN")}`
        : "Unavailable",
      rating: rating,
      productUrl: link || searchUrl,
      imageUrl: image,
    };
  } catch (err) {
    console.error("Flipkart Scraping Error:", err.message);
    return {
      store: "Flipkart",
      found: false,
      title: query,
      price: null,
      currency: "INR",
      formattedPrice: "Unavailable",
      rating: null,
      productUrl: searchUrl,
      imageUrl: null,
    };
  }
};

// -----------------------------------------------------------------
// 3. Comparison Engine
// -----------------------------------------------------------------
export const comparePrices = async (query) => {
  const [amazonResult, flipkartResult] = await Promise.all([
    scrapeAmazonPrice(query),
    scrapeFlipkartPrice(query),
  ]);

  let difference = null;
  let savingsPercentage = null;
  let bestDeal = null;

  if (amazonResult.found && flipkartResult.found) {
    const diff = Math.abs(amazonResult.price - flipkartResult.price);
    const maxPrice = Math.max(amazonResult.price, flipkartResult.price);
    const pct = maxPrice > 0 ? ((diff / maxPrice) * 100).toFixed(1) : 0;

    difference = diff;
    savingsPercentage = `${pct}%`;

    if (amazonResult.price < flipkartResult.price) {
      bestDeal = {
        store: "Amazon",
        savings: diff,
        formattedSavings: `₹${diff.toLocaleString("en-IN")}`,
        message: `Amazon is cheaper by ₹${diff.toLocaleString("en-IN")} (${pct}% off)`,
      };
    } else if (flipkartResult.price < amazonResult.price) {
      bestDeal = {
        store: "Flipkart",
        savings: diff,
        formattedSavings: `₹${diff.toLocaleString("en-IN")}`,
        message: `Flipkart is cheaper by ₹${diff.toLocaleString("en-IN")} (${pct}% off)`,
      };
    } else {
      bestDeal = {
        store: "Both",
        savings: 0,
        formattedSavings: "₹0",
        message: "Prices are identical on both platforms",
      };
    }
  } else if (amazonResult.found && !flipkartResult.found) {
    bestDeal = {
      store: "Amazon",
      savings: 0,
      formattedSavings: "₹0",
      message: "Only found in stock on Amazon",
    };
  } else if (!amazonResult.found && flipkartResult.found) {
    bestDeal = {
      store: "Flipkart",
      savings: 0,
      formattedSavings: "₹0",
      message: "Only found in stock on Flipkart",
    };
  }

  return {
    query,
    searchedAt: new Date().toISOString(),
    bestDeal,
    priceDifference: difference
      ? `₹${difference.toLocaleString("en-IN")}`
      : null,
    savingsPercentage,
    comparisons: {
      amazon: amazonResult,
      flipkart: flipkartResult,
    },
  };
};
