import { attachPCBVIN, detachPCBVIN, swapPCB, bulkAttach, getAllVehicles, getVehicleByVIN } from "../services/vehicleService.js";

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


export async function swapPCBController(req, res){
    try{
        const {current_pcb_id, new_pcb_id, VIN} = req.body;

        const result = await swapPCB(current_pcb_id, new_pcb_id, VIN);

        return res.status(200).json(result);

    }catch(e){
        if (
            e.message === "Vehicle does not exist" ||
            e.message === "Current PCB not found" ||
            e.message === "New PCB not found"
        ) {
            return res.status(404).json({ Error: e.message });
        }

        if (
            e.message.includes("already assigned") ||
            e.message.includes("not mapped")
        ) {
            return res.status(409).json({ Error: e.message });
        }

        return res.status(400).json({ Error: e.message });
    }
}

export async function bulkMapPCBVINController(req, res){
    try{
        const mappings = req.body?.mappings;
        console.log(mappings)

        if (!Array.isArray(mappings) || mappings.length === 0) {
            return res.status(400).json({
                error: "Invalid input. 'mappings' must be a non-empty array"
            });
        }

        const result = await bulkAttach(mappings);

        return res.status(200).json(result);

    }catch(e){
        return res.status(400).json({
            error: e.message
        })
    }
}

export async function getVehicleController(req, res){
    try{

        const {vin} = req.query;

        if(vin){
            const vehicle = await getVehicleByVIN(vin);
            return res.status(200).json(vehicle);
        }

        const vehicles = await getAllVehicles();
        return res.status(200).json(vehicles);

    }catch(e){
        return res.status(500).json({
            error: e.message
        });
    }
}
