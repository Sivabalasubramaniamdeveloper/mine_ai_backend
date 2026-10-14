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
