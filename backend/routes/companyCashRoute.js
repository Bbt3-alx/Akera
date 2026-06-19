import express from "express";

import {
  createDeposit,
  getCash,
} from "../controllers/companyCash.controller.js";
import { audit } from "../middlewares/audit.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { requireManagerContext } from "../middlewares/requireManagerContext.js";
import { requireCompanyModule } from "../middlewares/requireCompanyModule.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";
import verifyTransactionPin from "../middlewares/verifyTransactionPin.js";
import { COMPANY_MODULES } from "../constants/companyModules.js";

const router = express.Router();

const activeCompanyAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
  requireCompanyModule(COMPANY_MODULES.COMPANY_CASH),
];

router.get("/", activeCompanyAccess, catchAsync(getCash));

router.post(
  "/deposits",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("COMPANY_CASH_DEPOSIT", "CompanyCashMovement"),
  catchAsync(createDeposit),
);

export default router;
