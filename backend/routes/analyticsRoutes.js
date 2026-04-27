import express from "express";
import { getTodayStatsController } from "../controller/analyticsController.js";

const router = express.Router();

// GET /VT/api/analytics/today-stats
router.get("/analytics/today-stats", getTodayStatsController);

export default router;