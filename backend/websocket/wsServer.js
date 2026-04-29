import { WebSocketServer } from "ws";

let wss = null;

/**
 * Attach a WebSocket server to the existing http.Server.
 * Call this once after the HTTP server is created.
 * @param {import("http").Server} server
 */
export function initWebSocketServer(server) {
  if (wss) return; // guard against double-init

  wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS] Client connected from ${ip}`);
    ws.isAlive = true;

    // Confirm connection to frontend
    ws.send(JSON.stringify({ type: "CONNECTED", message: "AL Tracker WebSocket ready" }));

    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("close", () => console.log(`[WS] Client disconnected from ${ip}`));
    ws.on("error", (err) => console.error("[WS] Client error:", err.message));
  });

  // Ping-pong keep-alive: terminate dead connections every 30 s
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeatInterval));

  console.log("[WS] WebSocket server initialised (sharing HTTP port)");
}

/** Return the WSS instance (may be null if not yet initialised). */
export function getWSS() {
  return wss;
}