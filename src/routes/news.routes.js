import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getCityNews } from "../controllers/news.controller.js";

const router = Router();

// Route to fetch web scraped local news by city (e.g. ?city=Chennai)
router.get("/", authenticate, getCityNews);

export default router;
