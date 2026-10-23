import cron from "node-cron";
import supabase from "../config/supabase.js";
import { sendExpenseReportEmail } from "./email.service.js";

/**
 * Initializes background scheduled jobs:
 * - Month-end automated expense report email (runs at 09:00 AM on month-end)
 */
export const initCronJobs = () => {
  // Checks daily at 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isMonthEnd = tomorrow.getDate() === 1;
    if (!isMonthEnd) return;

    console.log("[Cron] Today is month end! Checking monthly expense reports...");
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, full_name");

      if (error || !users) return;

      const monthName = today.toLocaleString("default", { month: "long", year: "numeric" });

      for (const u of users) {
        if (!u.email) continue;
        try {
          await sendExpenseReportEmail({
            to: u.email,
            userName: u.full_name || "MineAI User",
            monthYear: monthName,
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            categorySummary: [],
          });
        } catch (e) {
          console.warn(`[Cron] Could not send month-end report to ${u.email}:`, e.message);
        }
      }
    } catch (err) {
      console.error("[Cron] Month-end report job error:", err.message);
    }
  });

  console.log("[Cron] Background cron scheduler initialized.");
};
