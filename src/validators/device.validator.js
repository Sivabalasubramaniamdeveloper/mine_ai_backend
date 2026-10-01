import { z } from "zod";

export const registerDeviceSchema = z.object({
  device_id: z.string().trim().min(1, "Device ID is required").max(255),

  device_name: z.string().trim().max(255).optional(),

  device_type: z.string().trim().max(50).optional(),

  os_name: z.string().trim().max(100).optional(),

  os_version: z.string().trim().max(100).optional(),

  app_version: z.string().trim().max(50).optional(),

  push_token: z.string().trim().max(1000).optional(),
});
