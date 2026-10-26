
import axios from "axios";
import * as cheerio from "cheerio";

// -------------------------------------------------------------
// 1. CONFIGURATION
// -------------------------------------------------------------

const REQUEST_TIMEOUT = 12000;
const MAX_RETRIES = 2;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

const BROWSER_HEADERS = {
  "User-Agent": USER_AGENTS[0],
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  "Cache-Control": "no-cache",
};

const AMAZON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
  "sec-ch-ua-platform": '"macOS"',
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

const MEESHO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  Referer: "https://www.meesho.com/",
};

// Tracks domains not permitted on free scraping proxy plans so we skip proxy and scrape directly
const scrapingAntDisabledDomains = new Set();

// -------------------------------------------------------------
// 2. SHARED HELPERS
// -------------------------------------------------------------

function parseNumericPrice(rawPrice) {
  if (rawPrice == null || rawPrice === "") {
    return null;
  }

  const cleaned = String(rawPrice)
    .replace(/[₹,\s]/g, "")
    .replace(/[^\d.]/g, "");

  const price = Number(cleaned);

  return Number.isFinite(price) && price > 0
    ? Math.round(price)
    : null;
}

function absoluteUrl(href, baseUrl) {
  if (!href) return null;

  try {
    const url = new URL(href, baseUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function normalizeProduct({
  id,
  store,
  title,
  price,
  rating = null,
  productUrl,
  imageUrl = null,
}) {
  if (!title || !price || !productUrl) {
    return null;
  }

  return {
    id: String(id || productUrl),
    store,
    title: title.trim(),
    price,
    currency: "INR",
    formattedPrice: `₹${price.toLocaleString("en-IN")}`,
    rating: rating || null,
    productUrl,
    imageUrl: imageUrl || null,
  };
}

function getHttpError(error) {
  const detail =
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message;

  return {
    message: detail || error.message,
    status: error.response?.status ?? null,
    code: error.code ?? null,
  };
}

// Retry temporary request failures with rotating user agents.
async function fetchHtml(url, extraOptions = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const ua = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
      const headers = {
        ...BROWSER_HEADERS,
        "User-Agent": ua,
        ...(extraOptions.headers || {}),
      };

      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        responseType: "text",
        ...extraOptions,
        headers,
      });

      if (typeof response.data !== "string") {
        throw new Error("Expected an HTML text response");
      }

      return response.data;
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const retryable =
        !status ||
        status === 408 ||
        status === 425 ||
        status === 429 ||
        status >= 500;

      if (!retryable || attempt > MAX_RETRIES) {
        throw error;
      }

      const delay = attempt * 1000;

      console.warn(
        `[HTTP Retry] Attempt ${attempt} failed for ${url}. ` +
          `Retrying in ${delay}ms: ${error.message}`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Robust fetcher that uses ScrapingAnt when available and supported,
 * but automatically and immediately falls back to direct HTTP scraping
 * if ScrapingAnt fails (e.g. Free plan domain restrictions, 422, timeouts, 403).
 */
async function fetchPageHtml(targetUrl, customHeaders = {}, storeName = "Store") {
  const apiKey = process.env.SCRAPINGANT_API_KEY;
  let hostname = "";
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {}

  // 1. Attempt ScrapingAnt if key exists and domain is not restricted on free tier
  if (apiKey && hostname && !scrapingAntDisabledDomains.has(hostname)) {
    try {
      const response = await axios.get("https://api.scrapingant.com/v2/general", {
        params: {
          "x-api-key": apiKey,
          url: targetUrl,
          browser: "false",
          proxy_country: "IN",
        },
        timeout: 15000,
        responseType: "text",
      });

      if (typeof response.data === "string" && response.data.trim().length > 100) {
        return response.data;
      }
    } catch (antErr) {
      const status = antErr.response?.status;
      let detail = antErr.message;
      if (typeof antErr.response?.data === "string") {
        try {
          const parsed = JSON.parse(antErr.response.data);
          detail = parsed.detail || detail;
        } catch {
          detail = antErr.response.data || detail;
        }
      } else if (antErr.response?.data?.detail) {
        detail = antErr.response.data.detail;
      }

      if (status === 422 && String(detail).includes("not allowed for Free subscription plan")) {
        console.warn(`[${storeName}] ScrapingAnt free plan domain restriction for '${hostname}'. Direct routing enabled.`);
        scrapingAntDisabledDomains.add(hostname);
      } else {
        console.warn(`[${storeName}] ScrapingAnt failed (${status || antErr.code}): ${detail}. Falling back to direct scraping.`);
      }
    }
  }

  // 2. Direct scraping fallback
  return await fetchHtml(targetUrl, { headers: customHeaders });
}

function validateHtml(html, store) {
  if (!html || typeof html !== "string" || html.trim().length < 100) {
    throw new Error(`${store} returned an empty or incomplete page`);
  }

  const $ = cheerio.load(html);
  const pageTitle = $("title").text().toLowerCase();

  if (
    pageTitle.includes("robot check") ||
    pageTitle.includes("verify you are human") ||
    $('form[action*="validateCaptcha"]').length > 0 ||
    $("#captchacharacters").length > 0
  ) {
    throw new Error(`${store} returned a bot-verification page`);
  }

  return $;
}

// -------------------------------------------------------------
// 3. AMAZON INDIA
// -------------------------------------------------------------

export async function scrapeAmazon(query, page = 1) {
  const targetUrl =
    `https://www.amazon.in/s?k=${encodeURIComponent(query)}` +
    `&page=${Number(page) || 1}`;

  try {
    const html = await fetchPageHtml(targetUrl, AMAZON_HEADERS, "Amazon");
    const $ = validateHtml(html, "Amazon");
    const products = [];
    const seen = new Set();

    $(
      '[data-component-type="s-search-result"][data-asin], ' +
        '.s-result-item[data-asin]'
    ).each((_, element) => {
      const card = $(element);
      const asin = card.attr("data-asin")?.trim();

      if (!asin || seen.has(asin)) return;

      const title =
        card.find("h2").text().replace(/\s+/g, " ").trim() ||
        card.find("h2 a span").first().text().trim() ||
        card.find("h2 span").first().text().trim();

      const priceText =
        card.find(".a-price .a-offscreen").first().text().trim() ||
        card.find(".a-price-whole").first().text().trim();

      const price = parseNumericPrice(priceText);

      const ratingText = card
        .find(".a-icon-alt")
        .first()
        .text()
        .trim();

      const imageUrl = absoluteUrl(
        card.find("img.s-image").first().attr("src"),
        "https://www.amazon.in"
      );

      // ASIN gives us a product URL rather than the search URL.
      const productUrl = `https://www.amazon.in/dp/${encodeURIComponent(asin)}`;

      const product = normalizeProduct({
        id: asin,
        store: "Amazon",
        title,
        price,
        rating: ratingText.match(/\d+(?:\.\d+)?/)?.[0] ?? null,
        productUrl,
        imageUrl,
      });

      if (product && price > 50) {
        seen.add(asin);
        products.push(product);
      }
    });

    if (products.length === 0) {
      console.warn(
        "[Amazon] Request succeeded, but no matching product cards were extracted."
      );
    }

    return products;
  } catch (error) {
    console.error("[Amazon Scraper Error]", getHttpError(error));
    throw error;
  }
}

// -------------------------------------------------------------
// 4. FLIPKART
// -------------------------------------------------------------

export async function scrapeFlipkart(query, page = 1) {
  const targetUrl =
    `https://www.flipkart.com/search?q=${encodeURIComponent(query)}` +
    `&page=${Number(page) || 1}`;

  try {
    const html = await fetchPageHtml(targetUrl, FLIPKART_HEADERS, "Flipkart");
    const $ = cheerio.load(html);
    const products = [];
    const seen = new Set();

    // -------------------------------------------------------------
    // Strategy 1: Targeted card containers (Single & Grid cards)
    // -------------------------------------------------------------
    $("div._75nlfW, div.tUxRFH, div[data-id], div._1AtVbE, div._4ddWXP, div.slAVV4").each((_, el) => {
      const titleCandidate =
        $(el)
          .find(".KzDlHZ, .wjcEIp, .WKTcLC, .wBy4fm, ._4rR01T, .s1Q9rs")
          .first()
          .text()
          .trim() || $(el).find("img").attr("alt");

      const priceText = $(el).find(".Nx9bqj, ._30jeq3").first().text().trim();
      const parsedPrice = parseNumericPrice(priceText);

      const relativeLink = $(el)
        .find("a.CGtC5Q, a._1fQZEK, a.VJA3rP, a[href*='/p/'], a")
        .first()
        .attr("href");

      const imgCandidate = $(el)
        .find("img.DByuf4, img._396cs4, img._53G40d, img")
        .first()
        .attr("src");

      const ratingText = $(el).find(".XQDdHH, ._3LWZlK").first().text().trim();

      const productUrl = absoluteUrl(relativeLink, "https://www.flipkart.com");

      if (titleCandidate && parsedPrice && parsedPrice > 50 && productUrl) {
        if (!seen.has(productUrl)) {
          seen.add(productUrl);
          const product = normalizeProduct({
            id: productUrl,
            store: "Flipkart",
            title: titleCandidate,
            price: parsedPrice,
            rating: ratingText || null,
            productUrl,
            imageUrl: absoluteUrl(imgCandidate, "https://www.flipkart.com"),
          });
          if (product) products.push(product);
        }
      }
    });

    // -------------------------------------------------------------
    // Strategy 2: Fallback using the ₹ selector across all cards
    // -------------------------------------------------------------
    if (products.length === 0) {
      $('div:contains("₹")').each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/₹\s*([0-9,]+)/);

        if (match && match[1]) {
          const potentialPrice = parseNumericPrice(match[1]);
          const card = $(el).closest("a, div[data-id]");

          if (card.length && potentialPrice && potentialPrice > 50) {
            const cardTitle =
              card.find("img").attr("alt") ||
              card
                .find("div.KzDlHZ, a.wBy4fm, .s1Q9rs, ._4rR01T, .wjcEIp, .WKTcLC")
                .first()
                .text()
                .trim();

            const cardImg = card.find("img").attr("src");
            const cardLink = card.is("a")
              ? card.attr("href")
              : card.find("a").attr("href");

            const productUrl = absoluteUrl(cardLink, "https://www.flipkart.com");

            if (cardTitle && cardTitle.length > 3 && productUrl && !seen.has(productUrl)) {
              seen.add(productUrl);
              const product = normalizeProduct({
                id: productUrl,
                store: "Flipkart",
                title: cardTitle,
                price: potentialPrice,
                rating: null,
                productUrl,
                imageUrl: absoluteUrl(cardImg, "https://www.flipkart.com"),
              });
              if (product) products.push(product);
            }
          }
        }
      });
    }

    return products;
  } catch (error) {
    console.error("[Flipkart Scraper Error]", getHttpError(error));
    throw error;
  }
}
// -------------------------------------------------------------
// 5. MEESHO
// -------------------------------------------------------------

export async function scrapeMeesho(query, page = 1) {
  const targetUrl =
    `https://www.meesho.com/search?q=${encodeURIComponent(query)}` +
    `&page=${Number(page) || 1}`;

  try {
    const html = await fetchPageHtml(targetUrl, MEESHO_HEADERS, "Meesho");

    const $ = validateHtml(html, "Meesho");
    const products = [];
    const seen = new Set();

    // First try product information embedded in page JSON.
    const nextData = $("#__NEXT_DATA__").html();

    if (nextData) {
      try {
        const parsed = JSON.parse(nextData);

        const rawProducts =
          parsed?.props?.pageProps?.initialState?.product?.productsList ||
          parsed?.props?.pageProps?.data?.products ||
          [];

        if (Array.isArray(rawProducts)) {
          for (const item of rawProducts) {
            const id = item.id ?? item.product_id;
            const slug = item.slug;
            const title = item.name ?? item.title ?? "";
            const price = parseNumericPrice(
              item.discounted_price ?? item.price
            );

            const rawUrl =
              item.productUrl ??
              (slug && id
                ? `/${slug}/p/${id}`
                : id
                  ? `/s/p/${id}`
                  : null);

            const productUrl = absoluteUrl(
              rawUrl,
              "https://www.meesho.com"
            );

            const imageUrl = absoluteUrl(
              item.image ?? item.image_url,
              "https://www.meesho.com"
            );

            if (!id || !productUrl || !title || !price || price <= 50) {
              continue;
            }

            if (seen.has(productUrl)) continue;
            seen.add(productUrl);

            const product = normalizeProduct({
              id,
              store: "Meesho",
              title,
              price,
              rating: item.rating ? String(item.rating) : null,
              productUrl,
              imageUrl,
            });

            if (product) products.push(product);
          }
        }
      } catch (error) {
        console.warn(
          "[Meesho] Could not parse embedded product JSON:",
          error.message
        );
      }
    }

    // Fall back to product links in the returned HTML.
    $('a[href*="/p/"]').each((_, element) => {
      const anchor = $(element);

      const productUrl = absoluteUrl(
        anchor.attr("href"),
        "https://www.meesho.com"
      );

      if (!productUrl || seen.has(productUrl)) return;

      const title =
        anchor.find("p").first().text().trim() ||
        anchor.find("span").first().text().trim() ||
        anchor.find("img").first().attr("alt")?.trim() ||
        "";

      const cardText = anchor.text().trim();
      const priceMatch = cardText.match(/₹\s*([\d,]+(?:\.\d{1,2})?)/);
      const price = parseNumericPrice(priceMatch?.[1]);

      const imageUrl = absoluteUrl(
        anchor.find("img").first().attr("src"),
        "https://www.meesho.com"
      );

      if (!title || !price || price <= 50) return;

      seen.add(productUrl);

      const product = normalizeProduct({
        id: productUrl,
        store: "Meesho",
        title,
        price,
        productUrl,
        imageUrl,
      });

      if (product) products.push(product);
    });

    if (products.length === 0) {
      console.warn(
        "[Meesho] Request succeeded, but no matching product cards were extracted."
      );
    }

    return products;
  } catch (error) {
    console.error("[Meesho Scraper Error]", getHttpError(error));
    throw error;
  }
}

// -------------------------------------------------------------
// 6. SEARCH ALL SELECTED STORES
// -------------------------------------------------------------

export async function searchAllStores({
  query,
  page = 1,
  limit = 20,
  store = "all",
}) {
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("A non-empty search query is required");
  }

  const storeFilter = String(store).toLowerCase();

  const scrapers = {
    amazon: scrapeAmazon,
    flipkart: scrapeFlipkart,
    meesho: scrapeMeesho,
  };

  const selectedStores =
    storeFilter === "all" ? Object.keys(scrapers) : [storeFilter];

  for (const name of selectedStores) {
    if (!scrapers[name]) {
      throw new Error(`Unsupported store: ${name}`);
    }
  }

  const results = await Promise.all(
    selectedStores.map(async (name) => {
      try {
        const products = await scrapers[name](query.trim(), page);

        return {
          store: name,
          success: true,
          count: products.length,
          products,
          error: null,
        };
      } catch (error) {
        return {
          store: name,
          success: false,
          count: 0,
          products: [],
          error: getHttpError(error),
        };
      }
    })
  );

  // Interleave products from successful stores.
  const combined = [];
  const maxLength = Math.max(
    0,
    ...results.map((result) => result.products.length)
  );

  for (let index = 0; index < maxLength; index++) {
    for (const result of results) {
      if (result.products[index]) {
        combined.push(result.products[index]);
      }
    }
  }

  const uniqueProducts = [
    ...new Map(
      combined.map((product) => [
        `${product.store}:${product.productUrl}`,
        product,
      ])
    ).values(),
  ];

  const validLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 20)
  );

  const products = uniqueProducts.slice(0, validLimit);

  const pricedProducts = uniqueProducts.filter(
    (product) => Number.isFinite(product.price) && product.price > 0
  );

  const bestDeal = pricedProducts.length
    ? pricedProducts.reduce((lowest, product) =>
        product.price < lowest.price ? product : lowest
      )
    : null;

  const successfulStores = results.filter(
    (result) => result.success
  ).length;

  const failedStores = results.length - successfulStores;

  const stores = Object.fromEntries(
    results.map((result) => [
      result.store,
      {
        success: result.success,
        count: result.count,
        error: result.error,
      },
    ])
  );

  const storesCount = {
    amazon: stores.amazon?.count ?? 0,
    flipkart: stores.flipkart?.count ?? 0,
    meesho: stores.meesho?.count ?? 0,
  };

  return {
    success: successfulStores > 0,
    partialSuccess: successfulStores > 0 && failedStores > 0,
    message:
      successfulStores === 0
        ? "All selected stores failed"
        : failedStores > 0
          ? "Products fetched with some store failures"
          : uniqueProducts.length === 0
            ? "Stores responded, but no products were extracted"
            : "Products fetched successfully",
    query: query.trim(),
    pagination: {
      currentPage: Number.parseInt(page, 10) || 1,
      pageSize: products.length,
      limit: validLimit,
      hasNextPage: uniqueProducts.length > products.length,
    },
    totalFound: uniqueProducts.length,
    bestDeal: bestDeal
      ? {
          store: bestDeal.store,
          title: bestDeal.title,
          price: bestDeal.price,
          formattedPrice: bestDeal.formattedPrice,
          productUrl: bestDeal.productUrl,
        }
      : null,
    storesCount,
    stores,
    products,
  };
}
