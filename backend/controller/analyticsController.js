import { getTodayStats } from "../services/analyticsService.js";

export async function getTodayStatsController(req, res) {
    try {
        const stats = await getTodayStats();
        return res.status(200).json(stats);
    } catch (e) {
        return res.status(500).json({ Error: e.message });
    }
}