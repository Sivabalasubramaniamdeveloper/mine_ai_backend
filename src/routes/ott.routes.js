import { Router } from "express";
import * as ottController from "../controllers/ott.controller.js";

const router = Router();

// GET /api/v1/ott/videos
router.get("/videos", ottController.getVideos);

// GET /api/v1/ott/videos/:id
router.get("/videos/:id", ottController.getVideoById);

export default router;