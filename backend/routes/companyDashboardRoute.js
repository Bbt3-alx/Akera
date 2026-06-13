import express from "express";

import { getDashboard } from "../controllers/companyDashboard.controller.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();

const activeCompanyAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
];

router.get("/", activeCompanyAccess, catchAsync(getDashboard));

export default router;
