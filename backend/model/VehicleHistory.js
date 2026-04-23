import { DataTypes } from "sequelize";
import { sequelize } from "../config/DB.js";

const VehicleHistory = sequelize.define("VehicleHistory",{
    id:{
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    vin:{
        type: DataTypes.STRING,
        allowNull: false
    },
    assigned_at:{
        type: DataTypes.DATE,
        allowNull: false
    },
    detached_at:{
        type: DataTypes.DATE
    }
},{
    tableName: "vehicle_history",
    timestamps: false
})

export default VehicleHistory;