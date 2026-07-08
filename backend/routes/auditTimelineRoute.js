import express from "express";

import { getAuditTimeline } from "../controllers/auditTimeline.controller.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { requireManagerContext } from "../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();

const activeCompanyManagerAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
  requireManagerContext,
];

router.get("/", activeCompanyManagerAccess, catchAsync(getAuditTimeline));

export default router;
