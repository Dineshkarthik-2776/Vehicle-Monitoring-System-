import { createPCBController, bulkCreatePCBController } from "../controller/pcbController.js";
import express from "express";

const router = express.Router();

router.post( "/pcb/creation" ,createPCBController);
router.post("/pcb/bulkCreation", bulkCreatePCBController)

export default router;
