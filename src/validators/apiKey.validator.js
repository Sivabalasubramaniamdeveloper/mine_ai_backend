import { z } from "zod";

export const createApiKeySchema = z.object({
  provider_id: z.string().uuid("Invalid provider ID"),

  key_name: z
    .string()
    .trim()
    .min(1, "Key name is required")
    .max(100, "Key name must not exceed 100 characters"),

  api_key: z
    .string()
    .trim()
    .min(10, "API key is invalid")
    .max(1000, "API key is too long"),
});

export const updateApiKeySchema = z.object({
  is_active: z.boolean(),
});
