import { Router } from "express";
import { getAggregatedProducts } from "../controllers/productSearch.controller.js";

const router = Router();

// GET /api/v1/products/search?q=earbuds&page=1&limit=20&store=all
router.get("/search", getAggregatedProducts);

export default router;