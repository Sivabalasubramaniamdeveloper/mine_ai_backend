import { Router } from "express";
import { getPriceComparison } from "../controllers/price.controller.js";
import { optionalAuthenticate } from "../middleware/auth.middleware.js";
import { enforcePriceComparisonLimit } from "../middleware/subscriptionLimit.middleware.js";

const router = Router();

// GET /api/v1/prices/compare?q=iPhone 15
router.get(
  "/compare",
  optionalAuthenticate,
  enforcePriceComparisonLimit,
  getPriceComparison
);

export default router;
