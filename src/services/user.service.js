import {
  getUserProfileById,
  updateUserProfile,
  getPlanCatalog,
  assignUserPlan,
} from "../repositories/user.repository.js";
import { sendPlanChangedEmail } from "./email.service.js";

import { getUserCreditsStatus } from "./credit.service.js";

export const getMyProfile = async (userId) => {
  const user = await getUserProfileById(userId);
  try {
    const creditStatus = await getUserCreditsStatus(userId);
    user.credits = creditStatus.credits;
    user.daily_credit_limit = creditStatus.dailyLimit;
    user.credits_used_today = creditStatus.usedToday;
    user.credits_recharge_countdown = creditStatus.rechargeCountdown;
    user.next_reset_at = creditStatus.nextResetAt;
  } catch (err) {
    console.warn("[UserService] Failed to sync credits:", err.message);
  }

  return user;
};

export const updateMyProfile = async (userId, data) => {
  return await updateUserProfile(userId, data);
};

// Keep plan catalog reads and assignments on the backend, where the service role can read the catalog.
export const getAvailablePlans = async () => getPlanCatalog();

// Persists a plan change first, then notifies the account email without delaying the API response.
export const updateMyPlan = async (userId, planId) => {
  const currentUser = await getUserProfileById(userId);
  const user = await assignUserPlan(userId, planId);
  const tierCode = user.plans?.tier_code;
  const planName =
    ({ 0: "Basic", 1: "Pro", 2: "Premium" })[tierCode] ?? "updated plan";
  if (currentUser.plan_id !== planId) {
    void sendPlanChangedEmail(user.email, planName).catch((error) =>
      console.error("Could not send plan change email:", error.message),
    );
  }
  return user;
};
