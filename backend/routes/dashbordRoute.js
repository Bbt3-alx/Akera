import { getDashboardData } from "../controllers/getDashboardStats.js";
import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

router.get("/", verifyToken, authorizeRoles(ROLES.MANAGER), getDashboardData);

export default router;
