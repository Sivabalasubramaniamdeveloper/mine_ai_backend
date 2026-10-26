import { z } from "zod";

export const createApiKeySchema = z.object({
  provider_id: z.string().uuid("Invalid provider ID").optional(),

  provider_name: z.string().trim().optional(),

  key_name: z
    .string()
    .trim()
    .min(1, "Key name is required")
    .max(100, "Key name must not exceed 100 characters"),

  api_key: z
    .string()
    .trim()
    .min(4, "Key value is too short")
    .max(1000, "Key value is too long"),
});

export const updateApiKeySchema = z.object({
  is_active: z.boolean(),
});
