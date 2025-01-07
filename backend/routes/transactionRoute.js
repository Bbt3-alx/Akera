import { makeTransaction } from "../controllers/manageTransaction.js";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import express from "express";

const router = express.Router();

router.post("/new", verifyToken, authorizeRoles("partner"), makeTransaction);
export default router;
