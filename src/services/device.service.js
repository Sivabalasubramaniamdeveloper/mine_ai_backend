import {
  findDeviceById,
  createDevice,
  updateDevice,
  getUserDevices,
  deleteDevice,
} from "../repositories/device.repository.js";

export const registerDevice = async (userId, data) => {
  const existingDevice = await findDeviceById(userId, data.device_id);

  if (existingDevice) {
    return await updateDevice(userId, data.device_id, {
      ...data,
      is_active: true,
      last_active_at: new Date().toISOString(),
    });
  }

  return await createDevice({
    ...data,
    user_id: userId,
    is_active: true,
    last_active_at: new Date().toISOString(),
  });
};

export const listDevices = async (userId) => {
  return await getUserDevices(userId);
};

export const removeDevice = async (userId, deviceId) => {
  await deleteDevice(userId, deviceId);
};
