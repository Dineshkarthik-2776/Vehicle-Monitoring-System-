import VehicleHistory from "../model/VehicleHistory.js";
import PCB from "../model/PCB.js";
import Vehicle from "../model/Vehicle.js";
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
        assigned_at: { [Op.between]: [startOfDay, endOfDay] },
      },
    }),
    VehicleHistory.count({
      where: {
        detached_at: { [Op.between]: [startOfDay, endOfDay] },
      },
    }),
  ]);

  return {
    entries,
    exits,
    date: startOfDay.toISOString().split("T")[0],
  };
}

/**
 * Returns daily activity counts for the last 7 days.
 * Used to plot the entries/exits area chart in Analytics.
 */
export async function getDailyActivity() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const history = await VehicleHistory.findAll({
    where: { assigned_at: { [Op.gte]: sevenDaysAgo } },
    order: [["assigned_at", "ASC"]],
  });

  // Build daily buckets for the last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date:    d.toISOString().split("T")[0],
      label:   d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      entries: 0,
      exits:   0,
    });
  }

  history.forEach((h) => {
    const dayStr = new Date(h.assigned_at).toISOString().split("T")[0];
    const bucket = days.find((d) => d.date === dayStr);
    if (bucket) bucket.entries += 1;

    if (h.detached_at) {
      const detachStr = new Date(h.detached_at).toISOString().split("T")[0];
      const detachBucket = days.find((d) => d.date === detachStr);
      if (detachBucket) detachBucket.exits += 1;
    }
  });

  return days;
}

/**
 * Returns PCB status breakdown counts.
 */
export async function getPCBStatusBreakdown() {
  const [available, assigned, faulty] = await Promise.all([
    PCB.count({ where: { status: "AVAILABLE" } }),
    PCB.count({ where: { status: "ASSIGNED" } }),
    PCB.count({ where: { status: "FAULTY" } }),
  ]);
  return { available, assigned, faulty };
}

/**
 * Combined summary endpoint.
 */
export async function getFullSummary() {
  const [todayStats, dailyActivity, pcbStatus, totalVehicles, totalPCBs] =
    await Promise.all([
      getTodayStats(),
      getDailyActivity(),
      getPCBStatusBreakdown(),
      Vehicle.count(),
      PCB.count(),
    ]);

  return { todayStats, dailyActivity, pcbStatus, totalVehicles, totalPCBs };
}

/**
 * Returns complete vehicle history from the ledger table.
 */
export async function getVehicleHistory() {
  const history = await VehicleHistory.findAll({
    order: [["assigned_at", "DESC"]],
  });
  return history;
}