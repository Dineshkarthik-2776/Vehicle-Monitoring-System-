import { WebSocketServer } from "ws";
import { handleIncomingData } from "../services/iotService.js";

let wss;

function buildTestPayload(rawData) {
    if (!rawData || typeof rawData !== "object") return null;

    const pcbId = rawData.pcb_id;
    const latitude = Number(rawData.latitude);
    const longitude = Number(rawData.longitude);
    const battery = Number(rawData.battery);

    if (!pcbId || Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(battery)) {
        return null;
    }

    return {
        pcb_id: String(pcbId),
        latitude,
        longitude,
        battery
    };
}

export function initWebSocketServer(server){
    wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {
        console.log("WS: client connected.");

        ws.on("message", async (message) => {
            try {
                const parsed = JSON.parse(message.toString());

                // Temporary test path: only accept test payloads that explicitly opt-in with #test.
                if (parsed?.command !== "#test") {
                    return;
                }

                const testPayload = buildTestPayload(parsed);
                if (!testPayload) {
                    ws.send(JSON.stringify({
                        type: "TEST_INPUT_ERROR",
                        message: "Invalid test payload. Required: command=#test, pcb_id, latitude, longitude, battery"
                    }));
                    return;
                }

                await handleIncomingData(testPayload);

                ws.send(JSON.stringify({
                    type: "TEST_INPUT_ACCEPTED",
                    data: testPayload
                }));
            } catch (e) {
                ws.send(JSON.stringify({
                    type: "TEST_INPUT_ERROR",
                    message: "Invalid JSON payload"
                }));
            }
        });

        ws.on("close", () => {
            console.log("WS: client disconnected.")
        })
    })
}

export function getWSS(){
    return wss;
}