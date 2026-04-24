import { mapPCBVINController, detachPCBVINController, swapPCBController, bulkMapPCBVINController, getVehicleController} from "../controller/vehicleController.js";

import express from 'express';

const router = express.Router();


router.post("/vehicle/attach", mapPCBVINController);
router.post("/vehicle/detach", detachPCBVINController);
router.post("/vehicle/swap", swapPCBController);
router.post("/vehicle/bulkAttach", bulkMapPCBVINController);
router.get("/vehicle", getVehicleController);

export default router; 