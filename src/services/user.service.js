import supabase from "../config/supabase.js";
import {
  getUserProfileById,
  updateUserProfile,
  getPlanCatalog,
  assignUserPlan,
} from "../repositories/user.repository.js";
import { sendPlanChangedEmail } from "./email.service.js";

import { getUserCreditsStatus } from "./credit.service.js";

const uploadAvatarToBucket = async (userId, avatarData) => {
  if (!avatarData || typeof avatarData !== "string") return avatarData;
  // If already a remote URL (and not base64 data URI), keep it
  if (avatarData.startsWith("http://") || avatarData.startsWith("https://")) {
    return avatarData;
  }

  try {
    let buffer;
    let contentType = "image/jpeg";
    if (avatarData.startsWith("data:")) {
      const match = avatarData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        buffer = Buffer.from(avatarData, "base64");
      }
    } else {
      buffer = Buffer.from(avatarData, "base64");
    }

    const ext = contentType.includes("png") ? "png" : "jpg";
    const filePath = `avatars/${userId}_${Date.now()}.${ext}`;

    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = buckets?.some((b) => b.name === "avatars");
    if (!hasBucket) {
      await supabase.storage.createBucket("avatars", { public: true });
    }

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[UserService] Bucket upload error:", uploadError.message);
      return avatarData;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("[UserService] Error uploading avatar to bucket:", err.message);
    return avatarData;
  }
};

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
  const existingUser = await getUserProfileById(userId);

  // Phone number immutability rule: once entered, user cannot change phone
  if (existingUser?.phone && existingUser.phone.trim().length > 0) {
    if (data.phone && data.phone.trim() !== existingUser.phone.trim()) {
      const err = new Error("Phone number cannot be changed once set");
      err.statusCode = 400;
      throw err;
    }
    data.phone = existingUser.phone;
  }

  // Save image in bucket and get public url
  if (data.avatar_url && data.avatar_url.startsWith("data:")) {
    data.avatar_url = await uploadAvatarToBucket(userId, data.avatar_url);
  }

  return await updateUserProfile(userId, data);
};

// Keep plan catalog reads and assignments on the backend, where the service role can read the catalog.
export const getAvailablePlans = async () => getPlanCatalog();

// Persists a plan change first, then notifies the account email without delaying the API response.
export const updateMyPlan = async (userId, planId) => {
  const currentUser = await getUserProfileById(userId);
  const user = await assignUserPlan(userId, planId);
  const tierCode = user.plans?.tier_code;
  const planMap = { 0: "Basic", 1: "Pro", 2: "Premium" };
  const planName = user.plans?.name || planMap[tierCode] || "updated plan";
  const targetEmail = user.email || currentUser.email;

  if (targetEmail) {
    void sendPlanChangedEmail(targetEmail, planName).catch((error) =>
      console.error("[UserService] Could not send plan change email:", error.message),
    );
  }
  return user;
};
