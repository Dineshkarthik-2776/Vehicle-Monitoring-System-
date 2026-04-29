import {
  getTodayStats,
  getDailyActivity,
  getPCBStatusBreakdown,
  getFullSummary,
  getVehicleHistory,
} from "../services/analyticsService.js";

export async function getTodayStatsController(req, res) {
  try {
    const stats = await getTodayStats();
    return res.status(200).json(stats);
  } catch (e) {
    return res.status(500).json({ Error: e.message });
  }
}

export async function getDailyActivityController(req, res) {
  try {
    const data = await getDailyActivity();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ Error: e.message });
  }
}

export async function getPCBStatusController(req, res) {
  try {
    const data = await getPCBStatusBreakdown();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ Error: e.message });
  }
}

export async function getFullSummaryController(req, res) {
  try {
    const data = await getFullSummary();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ Error: e.message });
  }
}

export async function getVehicleHistoryController(req, res) {
  try {
    const data = await getVehicleHistory();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ Error: e.message });
  }
}