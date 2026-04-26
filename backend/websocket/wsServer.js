import { WebSocketServer } from "ws";

let wss;

export function initWebSocketServer(server){
    wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {
        console.log("WS: client connected.");

        ws.on("end", () => {
            console.log("WS: client disconnected.")
        })
    })
}

export function getWSS(){
    return wss;
}