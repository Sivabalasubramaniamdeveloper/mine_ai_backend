import { z } from "zod";

export const chatSchema = z.object({
  session_id: z.string().uuid("Invalid session ID").nullable().optional(),

  provider: z.string().trim().min(1, "Provider is required"),

  model: z
    .string()
    .trim()
    .min(1, "Model is required")
    .max(200, "Model name is too long"),

  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(20000, "Message is too long"),

  api_key_id: z.string().uuid("Invalid API key ID").nullable().optional(),
});
