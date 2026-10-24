import { z } from "zod";

// Validates credentials before sending a login request to Supabase Auth.
export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  fcm_token: z.string().trim().optional(),
  push_token: z.string().trim().optional(),
});
