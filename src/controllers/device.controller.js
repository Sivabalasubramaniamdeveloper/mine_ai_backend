import * as deviceService from "../services/device.service.js";

export const registerDevice = async (req, res, next) => {
  try {
    const device = await deviceService.registerDevice(req.user.id, req.body);

    return res.status(200).json({
      success: true,

      message: "Device registered successfully",

      data: {
        device,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listDevices = async (req, res, next) => {
  try {
    const devices = await deviceService.listDevices(req.user.id);

    return res.status(200).json({
      success: true,

      message: "Devices fetched successfully",

      data: {
        devices,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeDevice = async (req, res, next) => {
  try {
    await deviceService.removeDevice(req.user.id, req.params.deviceId);

    return res.status(200).json({
      success: true,

      message: "Device removed successfully",
    });
  } catch (error) {
    next(error);
  }
};
