import PCB  from "../model/PCB.js";
import Vehicle from "../model/Vehicle.js";
import VehicleHistory from "../model/VehicleHistory.js";
import { sequelize } from "../config/DB.js";

function parsePcbId(value) {
    const pcbId = Number(value);
    if (!Number.isInteger(pcbId) || pcbId <= 0) {
        return null;
    }
    return pcbId;
}

//ATTACH
export async function attachPCBVIN(pcb_id, VIN){
    const transaction = await sequelize.transaction();
    try{
        const pcbId = parsePcbId(pcb_id);
        const vin = typeof VIN === "string" ? VIN.trim() : "";
        if (!pcbId) {
            throw new Error("pcb_id must be a positive integer");
        }
        if (!vin) {
            throw new Error("VIN must be a non-empty string");
        }

        // Check if PCB exists
        const pcb = await PCB.findByPk(pcbId, { transaction });
        if(!pcb){
            throw new Error(`PCB ${pcbId} not found`);
        }
        
        // Check if PCB is FAULTY
        if(pcb.status === "FAULTY"){
            throw new Error(pcbId + " is Faulty PCB cant assign");
        }
        
        // Check if PCB is already ASSIGNED
        if(pcb.status === "ASSIGNED"){
            const assignedVehicle = await Vehicle.findOne({ where: { current_pcb_id: pcbId }, transaction });
            if(assignedVehicle){
                throw new Error(`PCB is already assigned to Vehicle with VIN: ${assignedVehicle.vin}`);
            }
        }
        
        // Check if VIN already exists in Vehicle table
        const existingVehicle = await Vehicle.findByPk(vin, { transaction });
        if(existingVehicle){
            throw new Error(`Vehicle is already assigned with PCB: ${existingVehicle.current_pcb_id}`);
        }

        // mapping logic
        // vehicle table entry
        await Vehicle.create({
            vin : vin,
            current_pcb_id : pcbId,
            assigned_at : new Date()
        }, { transaction });

        // PCB table: mark as assigned
        await pcb.update({ status: "ASSIGNED" }, { transaction });
        
        // history (ledger)
        await VehicleHistory.create({
            vin : vin,
            assigned_at : new Date()
        }, { transaction });

        await transaction.commit();
    }catch(e){
        await transaction.rollback();
        console.log(e);
        throw e;
    }

}

//DETACH
export async function detachPCBVIN(pcb_id, VIN){
    const transaction = await sequelize.transaction();
    try{
        const pcbId = parsePcbId(pcb_id);
        const vin = typeof VIN === "string" ? VIN.trim() : "";

        if (!pcbId || !vin) {
            throw new Error("Both pcb_id (positive integer) and VIN are required");
        }

        const vehicle = await Vehicle.findByPk(vin, { transaction });
        if(!vehicle){
            throw new Error("Vehicle is not exist !");
        }

        const pcb = await PCB.findByPk(pcbId, { transaction });
        if(!pcb){
            throw new Error("PCB is not exist !");
        }

        // Validate that the VIN and PCB pair is currently mapped.
        if(vehicle.current_pcb_id !== pcbId){
            throw new Error("Given VIN is not mapped with the given pcb_id");
        }

        // 1) PCB table: make PCB available again.
        await pcb.update({ status: "AVAILABLE" }, { transaction });

        // 2) Vehicle table: remove active VIN record.
        await Vehicle.destroy({
            where: { vin },
            transaction
        });

        // 3) VehicleHistory table: set detached_at for the latest active row.
        const activeHistory = await VehicleHistory.findOne({
            where: {
                vin,
                detached_at: null
            },
            order: [["assigned_at", "DESC"]],
            transaction
        });

        if (!activeHistory) {
            throw new Error("No active vehicle history found to detach");
        }

        await activeHistory.update(
            { detached_at: new Date() },
            { transaction }
        );

        await transaction.commit();

        return {
            pcb_id: pcbId,
            VIN: vin,
            message: "PCB detached successfully"
        };


    }catch(e){
        await transaction.rollback();
        console.log(e);
        throw e;
    }

}
