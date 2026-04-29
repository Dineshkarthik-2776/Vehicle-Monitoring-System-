import PCB from "../model/PCB.js";
import PCBLocation from "../model/PCBLocation.js";
import Vehicle from "../model/Vehicle.js";
import { broadcast } from "./wsService.js";

/**
 * Safely parse a PCB ID from either:
 *   - a plain integer: 1
 *   - a string integer: "1"
 *   - a "PCB1"-prefixed string: "PCB1"
 * Returns null if invalid.
 */
function parsePcbId(value) {
  if (value == null) return null;
  const str = String(value).trim().toUpperCase().replace(/^PCB/, "");
  const num = parseInt(str, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

/**
 * Handle a parsed IoT payload and update DB + broadcast live update.
 * @param {{ pcb_id: number|string, latitude: number, longitude: number, battery: number }} payload
 */
export async function handleIncomingData(payload) {
  try {
    const pcbId = parsePcbId(payload.pcb_id);
    if (!pcbId) {
      console.warn("[IoT] Invalid PCB ID:", payload.pcb_id);
      return;
    }

    const latitude  = parseFloat(payload.latitude);
    const longitude = parseFloat(payload.longitude);
    const battery   = parseFloat(payload.battery);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn("[IoT] Invalid coordinates:", payload);
      return;
    }

    const now = new Date();

    // 1) Update PCB battery level
    await PCB.update(
      { battery_level: isNaN(battery) ? null : battery },
      { where: { pcb_id: pcbId } }
    );

    // 2) Upsert GPS location
    await PCBLocation.upsert({
      pcb_id: pcbId,
      latitude,
      longitude,
      last_updated: now,
    });

    // 3) Update vehicle last_movement_at
    await Vehicle.update(
      { last_movement_at: now },
      { where: { current_pcb_id: pcbId } }
    );

    // 4) Find the vehicle mapped to this PCB (for WS broadcast)
    const vehicle = await Vehicle.findOne({ where: { current_pcb_id: pcbId } });

    // 5) Broadcast live update to all connected WebSocket clients
    broadcast({
      type: "LOCATION_UPDATE",
      data: {
        pcb_id:    pcbId,
        vin:       vehicle ? vehicle.vin : null,
        latitude,
        longitude,
        battery:   isNaN(battery) ? null : battery,
        timestamp: now,
      },
    });

    console.log(`[IoT] PCB${pcbId} updated — lat:${latitude} lng:${longitude} bat:${battery}%`);

  } catch (e) {
    console.error("[IoT] Processing error:", e.message);
  }
}