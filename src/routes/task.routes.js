import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  extractTask,
  notifyTaskEmail,
} from "../controllers/task.controller.js";

const router = Router();

router.post("/extract", authenticate, extractTask);
router.post("/notify-email", authenticate, notifyTaskEmail);

export default router;
