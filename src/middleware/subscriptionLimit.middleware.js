// src/middleware/subscriptionLimit.middleware.js
import supabase from "../config/supabase.js";

export const enforceScrapingLimit = async (req, res, next) => {
  const userId = req.user?.id;
  let allowedDaily = 2; // Basic: 2, Pro: 10, Premium: 25
  let planName = "Basic";

  if (userId) {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("plans(tier_code, daily_web_scrapes)")
        .eq("id", userId)
        .maybeSingle();

      const tierCode = userData?.plans?.tier_code ?? 0;
      if (tierCode === 1) {
        allowedDaily = userData?.plans?.daily_web_scrapes || 10;
        planName = "Pro";
      } else if (tierCode === 2) {
        allowedDaily = userData?.plans?.daily_web_scrapes || 25;
        planName = "Premium";
      } else {
        allowedDaily = userData?.plans?.daily_web_scrapes || 2;
        planName = "Basic";
      }
    } catch (_) {
      allowedDaily = 2;
      planName = "Basic";
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const userIdentifier = userId || req.ip || "anonymous";

  try {
    const { count, error: countError } = await supabase
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userIdentifier)
      .eq("request_type", "scrape")
      .gte("created_at", `${today}T00:00:00.000Z`);

    const currentUsage = countError ? 0 : (count || 0);

    if (currentUsage >= allowedDaily) {
      return res.status(429).json({
        success: false,
        message: `Daily product search limit reached (${allowedDaily}/day) for your ${planName} plan. Upgrade to search more.`,
        quota: {
          limit: allowedDaily,
          used: currentUsage,
          remaining: 0,
          plan: planName,
        },
      });
    }

    // Async record usage log (fail-safe)
    if (userId) {
      supabase
        .from("usage_logs")
        .insert({
          user_id: userId,
          request_type: "scrape",
          created_at: new Date().toISOString(),
        })
        .then(() => {})
        .catch(() => {});
    }

    req.scrapeQuota = {
      limit: allowedDaily,
      used: currentUsage + 1,
      remaining: Math.max(0, allowedDaily - (currentUsage + 1)),
      plan: planName,
    };
  } catch (err) {
    req.scrapeQuota = {
      limit: allowedDaily,
      used: 1,
      remaining: allowedDaily - 1,
      plan: planName,
    };
  }

  next();
};

export const enforcePriceComparisonLimit = async (req, res, next) => {
  const userId = req.user?.id;

  // 1. Determine plan limits: Basic (5/day), Pro (15/day), Premium (30/day)
  let allowedDaily = 5;
  let planName = "Basic";

  if (userId) {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("plans(tier_code, name)")
        .eq("id", userId)
        .maybeSingle();

      const tierCode = userData?.plans?.tier_code ?? 0;
      if (tierCode === 1) {
        allowedDaily = 15;
        planName = "Pro";
      } else if (tierCode === 2) {
        allowedDaily = 30;
        planName = "Premium";
      } else {
        allowedDaily = 5;
        planName = "Basic";
      }
    } catch (_) {
      allowedDaily = 5;
      planName = "Basic";
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const userIdentifier = userId || req.ip || "anonymous";

  try {
    const { count, error } = await supabase
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userIdentifier)
      .eq("request_type", "price_compare")
      .gte("created_at", `${today}T00:00:00.000Z`);

    const currentUsage = error ? 0 : (count || 0);

    if (currentUsage >= allowedDaily) {
      return res.status(429).json({
        success: false,
        message: `Daily price comparison limit reached (${allowedDaily}/day) for your ${planName} plan. Upgrade to search more.`,
        quota: {
          limit: allowedDaily,
          used: currentUsage,
          remaining: 0,
          plan: planName,
        },
      });
    }

    // Async record usage log (fail-safe)
    if (userId) {
      supabase
        .from("usage_logs")
        .insert({
          user_id: userId,
          request_type: "price_compare",
          created_at: new Date().toISOString(),
        })
        .then(() => {})
        .catch(() => {});
    }

    req.priceQuota = {
      limit: allowedDaily,
      used: currentUsage + 1,
      remaining: Math.max(0, allowedDaily - (currentUsage + 1)),
      plan: planName,
    };
  } catch (err) {
    req.priceQuota = {
      limit: allowedDaily,
      used: 1,
      remaining: allowedDaily - 1,
      plan: planName,
    };
  }

  next();
};
