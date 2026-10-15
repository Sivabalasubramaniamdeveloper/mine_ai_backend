import { Router } from "express";
import { register, login ,refreshSession} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { registerSchema, loginSchema, } from "../validators/auth.validator.js";
import { refreshTokenSchema } from "../validators/refreshToken.validator.js";
const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refreshSession);

export default router;
