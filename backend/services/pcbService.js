import PCB  from "../model/PCB.js";

export async function createPCB(data){
    try{

        if(!data.pcb_id || !data.battery_level){
            throw new Error("Enter all the required data.");
        }

        const exists = await PCB.findByPk(data.pcb_id);

        if(exists){
            throw new Error("PCB already exists")
        }

        const pcb = await PCB.create({
            pcb_id: data.pcb_id,
            status: data.status || "AVAILABLE",
            battery_level: data.battery_level,
            last_seen: data.last_seen ? new Date(data.last_seen) : new Date()
        });

        return "PCB data inserted successfully"
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

        const pcbs = data.map((pcb) => ({
            pcb_id: pcb.pcb_id,
            status: pcb.status || "AVAILABLE",
            battery_level: pcb.battery_level,
            last_seen: pcb.last_seen ? new Date(pcb.last_seen) : new Date()
        }));

        const res = await PCB.bulkCreate(pcbs, {
            validate: true,
            ignoreDuplicates: true
        });

        return "Bulk PCB inserted successfully";

    }catch(e){
        console.log("Error: ", e);
        throw e;
    }
}