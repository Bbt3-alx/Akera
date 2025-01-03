import { partnerMakeTransaction } from "../controllers/manageTransaction.js";
import verifyToken from "../middlewares/verifyToken.js";
import express from "express";

const router = express.Router();

router.post("/:partnerId", verifyToken, partnerMakeTransaction);

export default router;
