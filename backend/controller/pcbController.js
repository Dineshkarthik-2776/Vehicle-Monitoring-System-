import { createPCB, bulkCreatePCB, getPCB, markPCBAsFaulty } from "../services/pcbService.js";

export async function createPCBController(req,res){
    try{
        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({ Error: "Invalid payload" });
        }

        const result = await createPCB(req.body);

        res.status(201).json({message: result})
    }catch(e){
        res.status(400).json({Error: e.message})
    }
}

export async function bulkCreatePCBController(req,res){
    try{
        const pcbs = req.body?.pcbs;
        if (!Array.isArray(pcbs) || pcbs.length === 0) {
            return res.status(400).json({ Error: "Invalid payload: pcbs array required" });
        }

        const result = await bulkCreatePCB(pcbs);

        res.status(201).json(result);

    }catch(e){
        res.status(400).json({Error: e.message})
    }
}

export async function getPCBController(req, res){
    
    try{
        //parse filters
        const filters = {};
        if(req.query.status) filters.status = String(req.query.status).trim();

        if (req.query.battery_level_lte !== undefined) {
            const batteryLevelLte = Number(req.query.battery_level_lte);
            if (Number.isNaN(batteryLevelLte)) {
                return res.status(400).json({ Error: "battery_level_lte must be a valid number" });
            }
            filters.battery_level_lte = batteryLevelLte;
        }

        if (req.query.battery_level_gte !== undefined) {
            const batteryLevelGte = Number(req.query.battery_level_gte);
            if (Number.isNaN(batteryLevelGte)) {
                return res.status(400).json({ Error: "battery_level_gte must be a valid number" });
            }
            filters.battery_level_gte = batteryLevelGte;
        }

        if (req.query.sort_by !== undefined) {
            const sortBy = String(req.query.sort_by).trim();
            if (!["pcb_id", "battery_level", "pcb_id_asc", "battery_level_desc"].includes(sortBy)) {
                return res.status(400).json({ Error: "sort_by must be either pcb_id or battery_level" });
            }
            filters.sort_by = sortBy;
        }

        const pcbs = await getPCB(filters);
        res.status(200).json(pcbs);
    }catch(e){
        res.status(500).json({Error: e.message});
    }
}

export async function markPCBAsFaultyController(req,res){
    try{
        const pcbId = req.query.pcb_id ? String(req.query.pcb_id).trim() : "";
        if (!pcbId) {
            return res.status(400).json({ Error: "pcb_id is required" });
        }

        await markPCBAsFaulty(pcbId);

        res.status(200).json({message : "Successfully marked as Faulty"});
    }catch(e){

        if(e.message === "PCB is not exist !"){
            res.status(404).json({Error : e.message});
        }else
            res.status(400).json({Error : e.message});
    }
    
}