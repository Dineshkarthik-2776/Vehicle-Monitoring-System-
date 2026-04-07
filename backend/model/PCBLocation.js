import { DataTypes } from "sequelize";
import { sequelize } from "../config/DB.js";

const PCBLocation = sequelize.define("PCBLocation",{
    pcb_id:{
        type: DataTypes.STRING,
        primaryKey: true
    },
    latitude:{
        type: DataTypes.DECIMAL(10,7),
        allowNull: false
    },
    longitude:{
        type: DataTypes.DECIMAL(10,7),
        allowNull: false
    },
    last_updated:{
        type: DataTypes.DATE,
        allowNull: false
    }
},{
    tableName: "pcb_location",
    timestamps: false
});

export default PCBLocation;