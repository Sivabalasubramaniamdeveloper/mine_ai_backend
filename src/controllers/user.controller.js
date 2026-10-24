import * as userService from "../services/user.service.js";
import * as emailService from "../services/email.service.js";
import supabase from "../config/supabase.js";

export const getMyProfile = async (req, res, next) => {
  try {
    const user = await userService.getMyProfile(req.user.id);

    return res.status(200).json({
      success: true,

      message: "User profile fetched successfully",

      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const user = await userService.updateMyProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,

      message: "User profile updated successfully",

      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Returns plans to the authenticated client without relying on its database policies.
export const getAvailablePlans = async (req, res, next) => {
  try {
    const plans = await userService.getAvailablePlans();
    return res.status(200).json({ success: true, data: { plans } });
  } catch (error) {
    next(error);
  }
};

// Updates only the authenticated user's plan and returns the persisted result.
export const updateMyPlan = async (req, res, next) => {
  try {
    const user = await userService.updateMyPlan(req.user.id, req.body.plan_id);
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

export const sendMonthlyExpenseReport = async (req, res, next) => {
  try {
    const { monthYear, totalIncome, totalExpense, balance, categorySummary } = req.body;
    const user = await userService.getMyProfile(req.user.id);
    if (!user?.email) {
      const err = new Error("Registered email not found for this account");
      err.statusCode = 400;
      throw err;
    }

    await emailService.sendExpenseReportEmail({
      to: user.email,
      userName: user.full_name || "MineAI User",
      monthYear: monthYear || new Date().toLocaleString("default", { month: "long", year: "numeric" }),
      totalIncome: totalIncome || 0,
      totalExpense: totalExpense || 0,
      balance: balance || 0,
      categorySummary: categorySummary || [],
    });

    return res.status(200).json({
      success: true,
      message: "Monthly expense report sent to your registered email! (Please check your Inbox and Spam/Junk folder)",
      data: { email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseEmailPreference = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("expense_email_preferences")
      .select("monthly_report_enabled")
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data: { monthly_report_enabled: data?.monthly_report_enabled ?? true } });
  } catch (error) { next(error); }
};

export const updateExpenseEmailPreference = async (req, res, next) => {
  try {
    if (typeof req.body.monthly_report_enabled !== "boolean") {
      const err = new Error("monthly_report_enabled must be true or false");
      err.statusCode = 400;
      throw err;
    }
    const { data, error } = await supabase.from("expense_email_preferences").upsert({
      user_id: req.user.id,
      monthly_report_enabled: req.body.monthly_report_enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("monthly_report_enabled").single();
    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
