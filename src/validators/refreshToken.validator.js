
import { z } from "zod";

export const refreshTokenSchema = z.object({
  refresh_token: z.string().trim().min(1, "Refresh token is required"),
});
