import * as userService from "../services/user.service.js";

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
