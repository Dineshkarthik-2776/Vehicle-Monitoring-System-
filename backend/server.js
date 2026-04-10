import express from "express";
import cors from "cors";

import {sequelize, connectDB} from './config/DB.js';
import './model/index.js';

import pcbRoutes from './routes/pcbRoutes.js';

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 8080;

app.get('/', (req,res) => {
    res.send("Hello from server!!");
});

app.use('/VT/api', pcbRoutes);

(async () => {
    try{
        await connectDB();

        await sequelize.sync({alter: true});

        app.listen(PORT, () => {
            console.log(`Server Running in port: http://localhost:${PORT}`);
        })

    }catch(e){
        console.log("Error in DB connection: ", e);
    }
})();


