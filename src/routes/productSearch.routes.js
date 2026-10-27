import { Router } from "express";
import { getAggregatedProducts } from "../controllers/productSearch.controller.js";
import { optionalAuthenticate } from "../middleware/auth.middleware.js";
import { enforceScrapingLimit } from "../middleware/subscriptionLimit.middleware.js";

const router = Router();

// GET /api/v1/products/search?q=earbuds&page=1&limit=20&store=all
router.get(
  "/search",
  optionalAuthenticate,
  enforceScrapingLimit,
  getAggregatedProducts
);

export default router;