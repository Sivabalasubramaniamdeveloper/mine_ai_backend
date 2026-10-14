import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters"),

  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can contain only letters, numbers and underscore",
    ),

  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),

  dob: z.string().date("Invalid date format"),

  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),

  country_code: z
    .string()
    .trim()
    .length(2, "Country code must contain 2 characters")
    .toUpperCase(),

  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .max(100, "Timezone must not exceed 100 characters"),

  language: z.string().trim().min(2).max(10).default("en"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),

  password: z.string().min(1, "Password is required"),
});
