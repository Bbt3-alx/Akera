import express from "express";

import {
  approveModificationRequest,
  listModificationRequests,
  rejectModificationRequest,
} from "../controllers/correspondentModificationRequest.controller.js";
import {
  COMPANY_MODULES,
  TRANSFER_WORKFLOWS,
} from "../constants/companyModules.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { requireCompanyModule } from "../middlewares/requireCompanyModule.js";
import { requireCompanyWorkflow } from "../middlewares/requireCompanyWorkflow.js";
import { requireManagerContext } from "../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";
import verifyTransactionPin from "../middlewares/verifyTransactionPin.js";

const router = express.Router();

const activeCompanyAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
  requireCompanyModule(COMPANY_MODULES.CORRESPONDENT_COLLECTIONS),
  requireCompanyWorkflow(TRANSFER_WORKFLOWS.CORRESPONDENT_COLLECTION),
];

router.get("/", activeCompanyAccess, catchAsync(listModificationRequests));

router.post(
  "/:requestId/approve",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  catchAsync(approveModificationRequest),
);

router.post(
  "/:requestId/reject",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  catchAsync(rejectModificationRequest),
);

export default router;
