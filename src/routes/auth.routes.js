import { Router } from "express";
import { login, refreshSession } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";
import { refreshTokenSchema } from "../validators/refreshToken.validator.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refreshSession);

export default router;
