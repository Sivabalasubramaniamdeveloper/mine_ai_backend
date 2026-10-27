// src/middleware/subscriptionLimit.middleware.js
import supabase from "../config/supabase.js";

export const enforceScrapingLimit = async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // Read the same plan foreign key that the subscription screen updates.
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("plans(tier_code, daily_web_scrapes)")
    .eq("id", userId)
    .single();

  if (userError || !userData?.plans) {
    return res.status(403).json({ success: false, message: "Active plan not found" });
  }

  const allowedDaily = userData.plans.daily_web_scrapes;
  const today = new Date().toISOString().split("T")[0];

  // 2. Count today's scrape requests
  const { count, error: countError } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("request_type", "scrape")
    .gte("created_at", `${today}T00:00:00.000Z`);

  if (countError) {
    return res.status(500).json({ success: false, message: countError.message });
  }

  if (count >= allowedDaily) {
    return res.status(429).json({
      success: false,
      message: `Daily web scraping limit reached (${allowedDaily}/day) for your plan. Please upgrade to increase your quota.`,
    });
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
