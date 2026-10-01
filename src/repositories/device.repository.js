import supabase from "../config/supabase.js";

export const findDeviceById = async (userId, deviceId) => {
  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const createDevice = async (deviceData) => {
  const { data, error } = await supabase
    .from("user_devices")
    .insert(deviceData)
    .select()
    .single();

  if (error) {
    const dbError = new Error(error.message);

    dbError.code = error.code;
    dbError.details = error.details;

    throw dbError;
  }

  return data;
};

export const updateDevice = async (userId, deviceId, deviceData) => {
  const { data, error } = await supabase
    .from("user_devices")
    .update(deviceData)
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getUserDevices = async (userId) => {
  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const deleteDevice = async (userId, deviceId) => {
  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("user_id", userId)
    .eq("device_id", deviceId);

  if (error) {
    throw new Error(error.message);
  }
};
