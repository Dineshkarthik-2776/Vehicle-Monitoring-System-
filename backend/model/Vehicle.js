import {DataTypes} from "sequelize";
import { sequelize } from "../config/DB.js";

const Vehicle = sequelize.define("Vehicle",{
    vin:{
        type: DataTypes.STRING,
        primaryKey: true
    },
    current_pcb_id:{
        type: DataTypes.INTEGER
    },
    assigned_at:{
        type: DataTypes.DATE,
        allowNull: false
    },
    last_movement_at:{
        type: DataTypes.DATE
    }
    },{
        tableName: "vehicle",
        timestamps: false
    });

export default Vehicle;