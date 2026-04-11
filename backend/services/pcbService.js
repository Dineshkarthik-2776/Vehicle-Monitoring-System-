import PCB  from "../model/PCB.js";
import PCBLocation from "../model/PCBLocation.js";

import { Op, literal } from "sequelize";

const ALLOWED_PCB_STATUS = new Set(["AVAILABLE", "ASSIGNED", "FAULTY"]);
const ALLOWED_SORT_OPTIONS = new Set(["pcb_id", "battery_level", "pcb_id_asc", "battery_level_desc"]);

export async function createPCB(data){
    try{
        if (!data || typeof data !== "object") {
            throw new Error("Invalid payload");
        }

        const pcbId = typeof data.pcb_id === "string" ? data.pcb_id.trim() : "";
        if(!pcbId){
            throw new Error("Enter the required data (pcb_id).");
        }

        if (data.status && !ALLOWED_PCB_STATUS.has(data.status)) {
            throw new Error("Invalid status. Allowed values: AVAILABLE, ASSIGNED, FAULTY");
        }

        const exists = await PCB.findByPk(pcbId);

        if(exists){
            throw new Error("PCB already exists")
        }

        await PCB.create({
            pcb_id: pcbId,
            status: data.status || "AVAILABLE"
        });

        await PCBLocation.create({
            pcb_id: pcbId,
            last_updated: new Date()
        });

        return "PCB data inserted successfully";
    }catch(e){
        console.log("Error: ", e);
        throw e;
    }
}

export async function bulkCreatePCB(data){
    try{

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Invalid PCB list");
        }

        const hasInvalidRecord = data.some((pcb) => {
            const pcbId = typeof pcb?.pcb_id === "string" ? pcb.pcb_id.trim() : "";
            return !pcbId;
        });
        if (hasInvalidRecord) {
            throw new Error("Each PCB must include pcb_id");
        }

        const hasInvalidStatus = data.some((pcb) => pcb?.status && !ALLOWED_PCB_STATUS.has(pcb.status));
        if (hasInvalidStatus) {
            throw new Error("Invalid status in one or more records. Allowed values: AVAILABLE, ASSIGNED, FAULTY");
        }

        const uniquePayloadMap = new Map();
        for (const pcb of data) {
            const pcbId = pcb.pcb_id.trim();
            if (!uniquePayloadMap.has(pcbId)) {
                uniquePayloadMap.set(pcbId, {
                    ...pcb,
                    pcb_id: pcbId
                });
            }
        }

        const uniquePayload = [...uniquePayloadMap.values()];
        const requestedIds = [...uniquePayloadMap.keys()];
        const existingPcbs = await PCB.findAll({
            where: {
                pcb_id: {
                    [Op.in]: requestedIds
                }
            },
            attributes: ["pcb_id"]
        });

        const existingIds = new Set(existingPcbs.map((pcb) => pcb.pcb_id));
        const newPcbsOnly = uniquePayload.filter((pcb) => !existingIds.has(pcb.pcb_id));

        if (newPcbsOnly.length === 0) {
            return {
                message: "No new PCB inserted. All given PCB IDs already exist.",
                createdCount: 0,
                skippedCount: requestedIds.length,
                skippedPcbIds: requestedIds
            };
        }

        //PCB table
        const pcbs = newPcbsOnly.map((pcb) => ({
            pcb_id: pcb.pcb_id,
            status: pcb.status || "AVAILABLE"
        }));

        await PCB.bulkCreate(pcbs, {
            validate: true,
            ignoreDuplicates: false
        });

        // PCB location table
        const pcb_loc = newPcbsOnly.map((pcb) => ({
            pcb_id: pcb.pcb_id,
            last_updated: new Date()
        }));

        await PCBLocation.bulkCreate(pcb_loc, {
            validate: true,
            ignoreDuplicates: true
        });

        return {
            message: "Bulk PCB creation completed",
            createdCount: newPcbsOnly.length,
            skippedCount: existingIds.size,
            skippedPcbIds: [...existingIds]
        };

    }catch(e){
        console.log("Error: ", e);
        throw e;
    }
}

export async function getPCB( filters = {}){
    try{

        if (!filters || typeof filters !== "object") {
            throw new Error("Invalid filters");
        }

        const where = {};

        // Status filter
        if (filters.status) {
            if (!ALLOWED_PCB_STATUS.has(filters.status)) {
                throw new Error("Invalid status. Allowed values: AVAILABLE, ASSIGNED, FAULTY");
            }
            where.status = filters.status;
        }
        // Battery level filter
        if (filters.battery_level_lte !== undefined) {
            where.battery_level = { ...(where.battery_level || {}), [Op.lte]: filters.battery_level_lte };
        }
        if (filters.battery_level_gte !== undefined) {
            where.battery_level = { ...(where.battery_level || {}), [Op.gte]: filters.battery_level_gte };
        }

        let order = [["pcb_id", "ASC"]];
        if (filters.sort_by) {
            if (!ALLOWED_SORT_OPTIONS.has(filters.sort_by)) {
                throw new Error("Invalid sort_by. Allowed values: pcb_id, battery_level");
            }

            if (filters.sort_by === "battery_level" || filters.sort_by === "battery_level_desc") {
                order = [
                    [literal('"battery_level" IS NULL'), "ASC"],
                    ["battery_level", "DESC"],
                    ["pcb_id", "ASC"]
                ];
            }
        }

        const pcbs = await PCB.findAll({ where, order });
        return pcbs;

    }catch (e){
        console.log("Error : ", e);
        throw e;
    }
}

export async function markPCBAsFaulty(pcb_id){

    try{
        const pcbId = typeof pcb_id === "string" ? pcb_id.trim() : "";
        if (!pcbId) {
            throw new Error("pcb_id is required");
        }

        const pcb = await PCB.findByPk(pcbId);

        if(!pcb){
            throw new Error("PCB is not exist !");
        }
        if(pcb.dataValues.status === "ASSIGNED"){
            throw new Error("PCB is assigned to a Vehicle, please detatch the PCB and try again !");
        }
        if(pcb.dataValues.status === "FAULTY"){
            throw new Error("Already marked as FAULTY !");
        }

        await PCB.update(
            {status : "FAULTY"},
            {where: {pcb_id: pcbId}}
        );

        return "Successfully marked as Faulty";

    }catch(e){
        console.log("Error : ", e);
        throw e;
    }
        
}