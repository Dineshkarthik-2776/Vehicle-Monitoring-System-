import express from "express";
import {
  getTodayStatsController,
  getDailyActivityController,
  getPCBStatusController,
  getFullSummaryController,
  getVehicleHistoryController,
} from "../controller/analyticsController.js";

const router = express.Router();

// GET /VT/api/analytics/today-stats  — today's entry/exit counts
router.get("/analytics/today-stats", getTodayStatsController);

// GET /VT/api/analytics/daily-activity  — last 7 days entries/exits
router.get("/analytics/daily-activity", getDailyActivityController);

// GET /VT/api/analytics/pcb-status  — available/assigned/faulty counts
router.get("/analytics/pcb-status", getPCBStatusController);

// GET /VT/api/analytics/summary  — all of the above in one call
router.get("/analytics/summary", getFullSummaryController);

// GET /VT/api/analytics/history  — all vehicle history data
router.get("/analytics/history", getVehicleHistoryController);

export default router;