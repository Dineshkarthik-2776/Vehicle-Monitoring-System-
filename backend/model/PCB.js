import { DataTypes } from "sequelize";
import { sequelize } from "../config/DB.js";

const PCB = sequelize.define("PCB",{
    pcb_id:{
        type: DataTypes.STRING,
        primaryKey: true
    },
    status:{
        type: DataTypes.ENUM("AVAILABLE","ASSIGNED","FAULTY"),
        allowNull: false
    },
    battery_level:{
        type: DataTypes.DECIMAL(5,2)
    }
},{
    tableName: "pcb",
    timestamps: false
});

export default PCB;