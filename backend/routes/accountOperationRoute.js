import express from "express";

import {
  confirmWithdrawal,
  createWithdrawalRequestController,
  getAccountOperations,
  rejectWithdrawal,
} from "../controllers/accountOperation.controller.js";
import { audit } from "../middlewares/audit.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { requireManagerContext } from "../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import { requireCompanyModule } from "../middlewares/requireCompanyModule.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";
import verifyTransactionPin from "../middlewares/verifyTransactionPin.js";
import { COMPANY_MODULES } from "../constants/companyModules.js";

const router = express.Router();

const activeCompanyAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
  requireCompanyModule(COMPANY_MODULES.ACCOUNT_OPERATIONS),
];

router.get("/", activeCompanyAccess, catchAsync(getAccountOperations));

router.post(
  "/withdrawal-requests",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("ACCOUNT_OPERATION_WITHDRAWAL_REQUEST", "AccountOperation"),
  catchAsync(createWithdrawalRequestController),
);

router.post(
  "/:operationCode/confirm",
  activeCompanyAccess,
  audit("ACCOUNT_OPERATION_CONFIRM", "AccountOperation"),
  catchAsync(confirmWithdrawal),
);

router.post(
  "/:operationCode/reject",
  activeCompanyAccess,
  audit("ACCOUNT_OPERATION_REJECT", "AccountOperation"),
  catchAsync(rejectWithdrawal),
);

export default router;
