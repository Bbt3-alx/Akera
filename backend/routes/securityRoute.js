import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {catchAsync} from "../middlewares/errorHandler.js";
import {
    setupTransactionPin,
} from "../controllers/security.controller.js";

const router = express.Router();
router.post(
    "/setup-transaction-pin",
    verifyToken,
    catchAsync(setupTransactionPin)
)

export default router;