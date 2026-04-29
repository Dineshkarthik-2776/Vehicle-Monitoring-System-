import express from "express";
import { handleIncomingData } from "../services/iotService.js";

const router = express.Router();

/**
 * POST /VT/api/test/simulate-ttn
 * Simulates a TTN uplink message for testing the full pipeline:
 *   IoT parse → DB update → WebSocket broadcast → Map pin
 *
 * Body: { "payload": "1,12.971598,77.594566,85" }
 *   OR: { "pcb_id": 1, "latitude": 12.971598, "longitude": 77.594566, "battery": 85 }
 */
router.post("/test/simulate-ttn", async (req, res) => {
  try {
    let parsed = null;

    // Accept raw CSV string
    if (typeof req.body.payload === "string") {
      const parts = req.body.payload.split(",");
      if (parts.length < 4) {
        return res.status(400).json({ error: "payload must be 'pcb_id,lat,lng,battery'" });
      }
      parsed = {
        pcb_id:    parseInt(parts[0].trim(), 10),
        latitude:  parseFloat(parts[1].trim()),
        longitude: parseFloat(parts[2].trim()),
        battery:   parseFloat(parts[3].trim()),
      };
    }

    // Accept individual fields
    if (!parsed && req.body.pcb_id != null) {
      parsed = {
        pcb_id:    parseInt(req.body.pcb_id, 10),
        latitude:  parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        battery:   parseFloat(req.body.battery),
      };
    }

    if (!parsed) {
      return res.status(400).json({
        error: "Provide either 'payload' (CSV string) or pcb_id/latitude/longitude/battery fields",
        example: { payload: "1,12.971598,77.594566,85" },
      });
    }

    if (isNaN(parsed.pcb_id) || isNaN(parsed.latitude) || isNaN(parsed.longitude)) {
      return res.status(400).json({ error: "Invalid numeric values in payload" });
    }

    console.log(`[TEST] Simulating TTN message:`, parsed);
    await handleIncomingData(parsed);

    return res.status(200).json({
      success: true,
      message: `Simulated TTN message for PCB${parsed.pcb_id}`,
      data: parsed,
    });
  } catch (e) {
    console.error("[TEST] Simulation error:", e.message);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
