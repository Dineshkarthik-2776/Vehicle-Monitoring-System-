import { getWSS } from "../websocket/wsServer.js";

export function broadcast(data){
    const wss = getWSS();

    if(!wss) return;

    wss.clients.forEach((client) => {
        if(client.readyState === 1){
            client.send(JSON.stringify(data));
        }
    })
};

