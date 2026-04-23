import { attachPCBVIN, detachPCBVIN } from "../services/mappingService.js";

export async function mapPCBVINController(req,res){
    try {
        const {pcb_id, VIN} = req.body;
        const pcbId = Number(pcb_id);
        const vin = typeof VIN === "string" ? VIN.trim() : "";

        if(
            !Number.isInteger(pcbId) ||
            pcbId <= 0 ||
            !vin
        ){
            return res.status(400).json({error : "Invalid request body. 'pcb_id' must be a positive integer and 'VIN' must be a non-empty string."});
        }

        await attachPCBVIN(pcbId, vin);
        
        return res.status(200).json({
            success: true,
            message: "PCB successfully mapped to Vehicle",
            pcb_id: pcbId,
            VIN: vin
        });
    } catch(error) {
        return res.status(400).json({
            error: error.message
        });
    }

}

export async function detachPCBVINController(req, res) {
    try {
        const pcbId = Number(req.body?.pcb_id);
        const vin = typeof req.body?.VIN === "string" ? req.body.VIN.trim() : "";

        if (!Number.isInteger(pcbId) || pcbId <= 0 || !vin) {
            return res.status(400).json({ Error: "Both pcb_id (positive integer) and VIN are required" });
        }

        const result = await detachPCBVIN(pcbId, vin);
        return res.status(200).json(result);
    } catch (e) {
        if (
            e.message === "PCB is not exist !" ||
            e.message === "Vehicle is not exist !" ||
            e.message === "No active vehicle history found to detach"
        ) {
            return res.status(404).json({ Error: e.message });
        }

        if (e.message === "Given VIN is not mapped with the given pcb_id") {
            return res.status(409).json({ Error: e.message });
        }

        return res.status(400).json({ Error: e.message });
    }
}