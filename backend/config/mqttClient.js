import mqtt from "mqtt";
import dotenv from "dotenv";
import { handleIncomingData } from "../services/iotService.js";

dotenv.config();

// ── TTN MQTT credentials ──────────────────────────────────────────────────────
// These match the working mosquitto_sub command exactly:
//   -h eu1.cloud.thethings.network -p 1883
//   -u "algps@ttn"
//   -P "NNSXS.BKL..."
//   -t "v3/algps@ttn/devices/+/up"
const REGION    = (process.env.TTN_REGION    || "eu1").trim();
const APP_ID    = (process.env.TTN_APP_ID    || "").trim();   // e.g. "algps@ttn"
const API_KEY   = (process.env.TTN_API_KEY   || "").trim();   // NNSXS.xxx
const DEVICE_ID = (process.env.TTN_DEVICE_ID || "").trim() || "+"; // "+" = all

// ── Guard: skip only if credentials are genuinely missing/placeholder ─────────
const isPlaceholder =
  !APP_ID  || APP_ID  === "your-ttn-app-id"        ||
  !API_KEY || API_KEY.startsWith("NNSXS.your");

function initMqtt() {
  if (isPlaceholder) {
    console.warn("[MQTT] TTN credentials not configured — MQTT skipped.");
    console.warn("[MQTT] Set TTN_APP_ID and TTN_API_KEY in backend/.env");
    return null;
  }

  const BROKER = `mqtt://${REGION}.cloud.thethings.network:1883`;
  // Topic matches working mosquitto command exactly
  const TOPIC  = `v3/${APP_ID}/devices/${DEVICE_ID}/up`;

  console.log("[MQTT] Connecting…");
  console.log(`[MQTT]   Broker  : ${BROKER}`);
  console.log(`[MQTT]   Username: ${APP_ID}`);
  console.log(`[MQTT]   Topic   : ${TOPIC}`);

  const client = mqtt.connect(BROKER, {
    username:        APP_ID,
    password:        API_KEY,
    reconnectPeriod: 5_000,  // auto-retry every 5 s
    connectTimeout:  20_000,
    keepalive:       60,
    clean:           true,
  });

  // ── Connection events ───────────────────────────────────────────────────────
  client.on("connect", () => {
    console.log(`[MQTT] ✓ Connected to ${REGION}.cloud.thethings.network`);
    client.subscribe(TOPIC, { qos: 0 }, (err) => {
      if (err) {
        console.error("[MQTT] ✗ Subscribe failed:", err.message);
      } else {
        console.log(`[MQTT] ✓ Subscribed to: ${TOPIC}`);
      }
    });
  });

  client.on("error",     (err) => console.error("[MQTT] Error:", err.message));
  client.on("reconnect", ()    => console.log("[MQTT] Reconnecting…"));
  client.on("offline",   ()    => console.warn("[MQTT] Offline — will retry automatically"));
  client.on("close",     ()    => console.warn("[MQTT] Connection closed"));

  // ── Message handler ─────────────────────────────────────────────────────────
  client.on("message", async (_topic, rawMsg) => {
    let msgStr = "";
    try {
      msgStr = rawMsg.toString();
      const data = JSON.parse(msgStr);

      let formatted = null;

      // ── Path A: TTN custom decoder → decoded_payload ──────────────────────
      // mosquitto command confirms structure:
      //   uplink_message.decoded_payload = { pcb_id, latitude, longitude, battery }
      const decoded = data?.uplink_message?.decoded_payload;

      if (decoded != null && decoded.pcb_id != null) {
        formatted = {
          pcb_id:    decoded.pcb_id,
          latitude:  decoded.latitude  ?? decoded.lat,
          longitude: decoded.longitude ?? decoded.lng ?? decoded.lon,
          battery:   decoded.battery   ?? decoded.battery_level ?? null,
        };
        console.log("[MQTT] ✓ decoded_payload received:", formatted);
      }

      // ── Path B: raw frm_payload = base64("pcb_id,lat,lng,battery") ────────
      if (!formatted) {
        const b64 = data?.uplink_message?.frm_payload;
        if (!b64) {
          console.warn("[MQTT] No decoded_payload or frm_payload — message skipped.");
          return;
        }
        const raw = Buffer.from(b64, "base64").toString("utf8").trim();
        console.log(`[MQTT] frm_payload CSV: "${raw}"`);
        const parts = raw.split(",");
        if (parts.length < 4) {
          console.warn("[MQTT] Bad CSV (need pcb_id,lat,lng,battery):", raw);
          return;
        }
        formatted = {
          pcb_id:    parseInt(parts[0].trim(), 10),
          latitude:  parseFloat(parts[1].trim()),
          longitude: parseFloat(parts[2].trim()),
          battery:   parseFloat(parts[3].trim()),
        };
        console.log("[MQTT] ✓ frm_payload parsed:", formatted);
      }

      // Basic sanity before writing to DB
      const lat = parseFloat(formatted.latitude);
      const lng = parseFloat(formatted.longitude);
      if (!formatted.pcb_id || isNaN(lat) || isNaN(lng)) {
        console.warn("[MQTT] Invalid data — dropping:", formatted);
        return;
      }

      await handleIncomingData(formatted);

    } catch (e) {
      console.error("[MQTT] Processing error:", e.message);
      if (msgStr) console.error("[MQTT] Raw (first 200 chars):", msgStr.slice(0, 200));
    }
  });

  return client;
}

export default initMqtt();