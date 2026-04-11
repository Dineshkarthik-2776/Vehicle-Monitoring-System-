import { createPCBController, bulkCreatePCBController, getPCBController, markPCBAsFaultyController } from "../controller/pcbController.js";
import express from "express";

const router = express.Router();

router.post( "/pcb/creation" ,createPCBController);
router.post("/pcb/bulkCreation", bulkCreatePCBController);
router.get("/pcb/",getPCBController);
router.post("/pcb/faulty", markPCBAsFaultyController);

export default router;
