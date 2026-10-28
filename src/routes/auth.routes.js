import { Router } from "express";
import { login, refreshSession, testEmail, forgotPassword, sendSignupWelcome } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";
import { refreshTokenSchema } from "../validators/refreshToken.validator.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refreshSession);
router.post("/forgot-password", forgotPassword);
router.post("/welcome", sendSignupWelcome);
router.post("/test-email", testEmail);
router.get("/test-email", testEmail);

export default router;
