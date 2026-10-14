// src/routes/weather.routes.js
import { Router } from "express";
import { getWeatherData } from "../controllers/weather.controller.js";

const router = Router();
router.get("/", getWeatherData);

export default router;
