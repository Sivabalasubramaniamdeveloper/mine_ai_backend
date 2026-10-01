import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { chatSchema } from "../validators/ai.validator.js";
import { chat } from "../controllers/ai.controller.js";

const router = Router();

router.post("/chat", authenticate, validate(chatSchema), chat);

export default router;
