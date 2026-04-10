import  Vehicle from "./Vehicle.js";
import VehicleHistory from "./VehicleHistory.js";
import PCB from "./PCB.js";
import PCBLocation  from "./PcbLocation.js";


Vehicle.belongsTo(PCB,{
    foreignKey: "current_pcb_id",
    targetKey: "pcb_id",
    onDelete: "SET NULL"
});

PCB.hasMany(Vehicle,{
    foreignKey: "current_pcb_id",
    sourceKey: "pcb_id"
});

VehicleHistory.belongsTo(Vehicle,{
    foreignKey: "vin",
    targetKey: "vin"
});

Vehicle.hasMany(VehicleHistory,{
    foreignKey: "vin",
    sourceKey: "vin"
});

PCBLocation.belongsTo(PCB,{
    foreignKey: "pcb_id",
    targetKey: "pcb_id",
    onDelete: "CASCADE",
});

PCB.hasMany(PCBLocation,{
    foreignKey: "pcb_id",
    sourceKey: "pcb_id"
});

export {
    Vehicle,
    VehicleHistory,
    PCB,
    PCBLocation
};