import PCB from "../model/PCB.js";
import PCBLocation from "../model/PCBLocation.js";
import Vehicle from "../model/Vehicle.js";
import { broadcast } from "./wsService.js";


function parsePcbId(pcb_id){
    return Number(pcb_id.replace("PCB", ""));
};

export async function handleIncomingData(payload){
    try{
        const pcbId = parsePcbId(payload.pcb_id);

        if (!pcbId) {
            console.log("Invalid PCB ID:", payload.pcb_id);
            return;
        }

        const now = new Date();

        // Update PCB
        await PCB.update(
            {
                battery_level: payload.battery,
            },
            { where: {pcb_id: pcbId}}
        );

        // Update Location
        await PCBLocation.upsert({
            pcb_id: pcbId,
            latitude: payload.latitude,
            longitude: payload.longitude,
            last_updated: now
        });

        // Update Vehicle
        await Vehicle.update(
            {last_movement_at: now},
            {where: {current_pcb_id: pcbId} }
        );

        // Websocket broadcast to frontend
        broadcast({
            type: "LOCATION_UPDATE",
            data: {
                pcb_id: pcbId,
                latitude: payload.latitude,
                longitude: payload.longitude,
                battery: payload.battery,
                timestamp: now
            }
        });

    }catch(e){
        console.log("IOT Processing error", e.message);
    }
}