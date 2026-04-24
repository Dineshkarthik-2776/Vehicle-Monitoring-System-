import { createPCBController, bulkCreatePCBController, getPCBController, markPCBAsFaultyController, getVINByPCBIdController } from "../controller/pcbController.js";

import express from "express";

const router = express.Router();

// PCB OPERATIONS
router.post( "/pcb/creation" ,createPCBController);
router.post("/pcb/bulkCreation", bulkCreatePCBController);
router.get("/pcb/",getPCBController);
router.post("/pcb/faulty", markPCBAsFaultyController);
router.get("/pcb/vin", getVINByPCBIdController);



export default router;
