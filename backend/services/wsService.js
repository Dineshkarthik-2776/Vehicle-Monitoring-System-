/**
 * wsService.js
 * Thin wrapper that delegates to wsServer.js (which holds the WSS instance).
 * Use broadcast(data) anywhere in the backend to push live updates to all
 * connected frontend clients.
 */
import { getWSS } from "../websocket/wsServer.js";

/**
 * Broadcast a JSON payload to every connected WebSocket client.
 * @param {{ type: string, data: object }} payload
 */
export function broadcast(payload) {
  const wss = getWSS();
  if (!wss) return;

  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = OPEN
      try {
        client.send(msg);
      } catch (e) {
        console.error("[WS] Failed to send to client:", e.message);
      }
    }
  });
}
