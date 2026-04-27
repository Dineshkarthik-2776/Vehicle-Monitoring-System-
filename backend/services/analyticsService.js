import VehicleHistory from "../model/VehicleHistory.js";
import { Op } from "sequelize";

/**
 * Returns today's entry count (assigned_at today) and exit count (detached_at today)
 * from the VehicleHistory ledger table.
 */
export async function getTodayStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [entries, exits] = await Promise.all([
        VehicleHistory.count({
            where: {
                assigned_at: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        }),
        VehicleHistory.count({
            where: {
                detached_at: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        })
    ]);

    return { entries, exits, date: startOfDay.toISOString().split("T")[0] };
}