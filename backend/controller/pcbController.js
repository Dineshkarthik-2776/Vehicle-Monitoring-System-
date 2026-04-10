import { createPCB, bulkCreatePCB } from "../services/pcbService.js";

export async function createPCBController(req,res){
    try{
        const result = await createPCB(req.body);

        res.status(201).json({message: result})
    }catch(e){
        res.status(400).json({Error: e.message})
    }
}

export async function bulkCreatePCBController(req,res){
    try{
        const {pcbs} = req.body;

        const result = await bulkCreatePCB(pcbs);

        res.status(201).json({
            message: result
        })

    }catch(e){
        res.status(400).json({Error: e.message})
    }
}