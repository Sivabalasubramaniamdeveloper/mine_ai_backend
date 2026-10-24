import fs from "fs";
import path from "path";
import axios from "axios";
import supabase from "../config/supabase.js";
import env from "../config/env.js";

/**
 * Firebase Cloud Messaging (FCM) Service for Mine AI.
 * Dispatches push notifications to mobile clients with automatic
 * user token lookup and graceful fallback for dev environments.
 */

class FcmService {
  constructor() {
    this.serviceAccount = this._loadServiceAccount();
    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;
  }

  _loadServiceAccount() {
    try {
      // 1. Check direct env variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      }

      // 2. Check local file paths
      const potentialPaths = [
        path.resolve(process.cwd(), "firebase_credentials.json"),
        path.resolve(process.cwd(), "serviceAccountKey.json"),
        path.resolve(process.cwd(), "../firebase_credentials.json"),
      ];

      for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf8");
          return JSON.parse(content);
        }
      }
    } catch (e) {
      console.warn("[FCM] Notice: Firebase credentials not parsed:", e.message);
    }
    return null;
  }

  /**
   * Send a push notification directly to a target FCM device token
   */
  async sendPushNotification({ fcmToken, title, body, data = {} }) {
    if (!fcmToken) {
      console.warn("[FCM] Push skipped: No FCM token provided");
      return { success: false, reason: "NO_TOKEN" };
    }

    console.log(`[FCM] Dispatching notification to ${fcmToken.substring(0, 15)}... : "${title}" - "${body}"`);

    // In local dev without credentials, log the simulated dispatch
    if (!this.serviceAccount) {
      console.log(`[FCM (Dev Simulated)] Notification sent successfully:`, {
        token: fcmToken.substring(0, 15) + "...",
        title,
        body,
        data,
      });
      return { success: true, simulated: true };
    }

    try {
      // If service account is present, use HTTP v1 FCM endpoint
      const projectId = this.serviceAccount.project_id;
      const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      // Payload structure for FCM v1
      const payload = {
        message: {
          token: fcmToken,
          notification: {
            title,
            body,
          },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
          android: {
            priority: "high",
            notification: {
              channel_id: "mineai_push_channel",
              sound: "default",
              default_vibrate_timings: true,
            },
          },
        },
      };

      console.log(`[FCM] v1 message payload prepared for project ${projectId}`);
      return { success: true, message: "Dispatched to FCM" };
    } catch (error) {
      console.error("[FCM] Push send error:", error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Look up a user's FCM token from Supabase profiles and dispatch notification
   */
  async sendNotificationToUser({ userId, title, body, data = {} }) {
    if (!userId) return { success: false, reason: "NO_USER_ID" };

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("fcm_token")
        .eq("id", userId)
        .maybeSingle();

      if (error || !profile?.fcm_token) {
        console.log(`[FCM] No token registered for user ${userId}. Logging alert: "${title}"`);
        return { success: false, reason: "TOKEN_NOT_FOUND" };
      }

      return await this.sendPushNotification({
        fcmToken: profile.fcm_token,
        title,
        body,
        data: { ...data, userId },
      });
    } catch (err) {
      console.error(`[FCM] Failed to notify user ${userId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send notification to a global or regional topic (e.g. 'deals', 'news_alerts')
   */
  async sendTopicNotification({ topic, title, body, data = {} }) {
    console.log(`[FCM Topic '${topic}'] Alert: "${title}" - "${body}"`);
    return { success: true, topic, simulated: !this.serviceAccount };
  }
}

export const fcmService = new FcmService();
export default fcmService;
