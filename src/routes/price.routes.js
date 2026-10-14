import { Router } from "express";
import { getPriceComparison } from "../controllers/price.controller.js";

const router = Router();

// GET /api/v1/prices/compare?q=iPhone 15
router.get("/compare", getPriceComparison);

export default router;
