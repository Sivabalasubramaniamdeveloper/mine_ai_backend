import supabase from "../config/supabase.js";

/**
 * Calculates and synchronizes user daily credits according to their subscription plan.
 * Credits automatically regenerate to the plan's daily limit every day (00:00 UTC).
 */
export const getUserCreditsStatus = async (userId) => {
  // 1. Fetch user profile with plan info
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, email, credits, updated_at, plan_id, plans(id, tier_code, name, daily_credits)")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new Error(userError?.message || "User not found");
  }

  const plan = user.plans || {
    tier_code: 0,
    name: "Basic",
    daily_credits: 100,
  };

  const dailyLimit = plan.daily_credits || 100;
  const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todayStart = `${todayDate}T00:00:00.000Z`;

  // 2. Sum credits used today from usage_logs
  const { data: todayLogs, error: logError } = await supabase
    .from("usage_logs")
    .select("credits_used")
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", todayStart);

  if (logError) {
    console.error("[CreditService] Failed to fetch today logs:", logError.message);
  }

  const usedToday = (todayLogs || []).reduce(
    (sum, row) => sum + (Number(row.credits_used) || 0),
    0
  );

  const remainingCredits = Math.max(0, dailyLimit - usedToday);

  // 3. Keep users.credits in sync
  if (user.credits !== remainingCredits) {
    await supabase
      .from("users")
      .update({ credits: remainingCredits })
      .eq("id", userId);
  }

  return {
    userId,
    credits: remainingCredits,
    dailyLimit,
    usedToday,
    planName: plan.name,
    tierCode: plan.tier_code,
  };
};

/**
 * Enforces credit limits and consumes credits for an AI action.
 * Throws 403 error if user has insufficient credits today.
 */
export const consumeCredits = async ({
  userId,
  amount = 20,
  actionType = "ai_task",
}) => {
  const status = await getUserCreditsStatus(userId);

  if (status.credits < amount) {
    const error = new Error(
      `Daily credit limit reached (${status.credits} left, requires ${amount}). As per your ${status.planName} plan, your credits will be fully regenerated tomorrow. You can also upgrade your plan for more daily credits.`
    );
    error.statusCode = 403;
    error.code = "INSUFFICIENT_CREDITS";
    error.credits = status.credits;
    error.dailyLimit = status.dailyLimit;
    throw error;
  }

  const newCredits = Math.max(0, status.credits - amount);

  // Update in DB
  await supabase
    .from("users")
    .update({ credits: newCredits })
    .eq("id", userId);

  return {
    success: true,
    previousCredits: status.credits,
    creditsLeft: newCredits,
    consumed: amount,
    dailyLimit: status.dailyLimit,
  };
};
