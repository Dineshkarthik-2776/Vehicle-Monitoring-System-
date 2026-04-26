import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import http from "http";


import {sequelize, connectDB} from './config/DB.js';
import { initWebSocketServer } from "./websocket/wsServer.js";
import './model/index.js';
import './config/mqttClient.js'

import pcbRoutes from './routes/pcbRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';

const app = express();
const server = http.createServer(app);
const swaggerDocument = YAML.load("./swagger.yaml");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use(cors());

const PORT = 8080;

app.get('/', (req,res) => {
    res.send("Hello from server!!");
});

app.use('/VT/api', pcbRoutes);
app.use('/VT/api', vehicleRoutes);

(async () => {
    try{
        await connectDB();

        await sequelize.sync({alter: true});
        initWebSocketServer(server);

        server.listen(PORT, () => {
            console.log(`Server Running in port: http://localhost:${PORT}`);
        })

    }catch(e){
        console.log("Error in DB connection: ", e);
    }
})();


