// src/middleware/subscriptionLimit.middleware.js
import supabase from "../config/supabase.js";

export const enforceScrapingLimit = async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // 1. Get user's active plan limit
  const { data: subData, error: subError } = await supabase
    .from("subscriptions")
    .select("plans(tier_code, daily_web_scrapes)")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (subError || !subData) {
    return res.status(403).json({ success: false, message: "Active plan not found" });
  }

  const allowedDaily = subData.plans.daily_web_scrapes;
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