import { z } from "zod";

export const updateUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can contain only letters, numbers and underscore",
    )
    .optional(),

  full_name: z.string().trim().min(2).max(100).optional(),

  dob: z.string().date("Invalid date format").optional(),

  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),

  country_code: z.string().trim().length(2).toUpperCase().optional(),

  timezone: z.string().trim().min(1).max(100).optional(),

  language: z.string().trim().min(2).max(10).optional(),

  avatar_url: z.string().url().optional(),

  phone: z.string().trim().max(20).optional(),
});

// Accept only a plan UUID; the service verifies that it exists before assigning it.
export const updateUserPlanSchema = z.object({
  plan_id: z.string().uuid(),
});
