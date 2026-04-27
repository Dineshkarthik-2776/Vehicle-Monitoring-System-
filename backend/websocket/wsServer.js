import { WebSocketServer } from "ws";

let wss;

export function initWebSocketServer(server) {
    wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {
        console.log("WS: client connected.");

        // Send a welcome/ping to confirm connection
        ws.send(JSON.stringify({ type: "CONNECTED", message: "WebSocket connected to AL Tracker" }));

        ws.on("close", () => {
            console.log("WS: client disconnected.");
        });

        ws.on("error", (err) => {
            console.error("WS: client error:", err.message);
        });
    });
}

export function getWSS() {
    return wss;
}