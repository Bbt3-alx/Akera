import express from "express";

import {
  getExchangeRate,
  updateExchangeRate,
} from "../controllers/exchangeRateController.js";
import { catchAsync, ApiError } from "../middlewares/errorHandler.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import { requireCompanyModule } from "../middlewares/requireCompanyModule.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";
import { COMPANY_MODULES } from "../constants/companyModules.js";

const router = express.Router();

const activeCompanyAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
  requireCompanyModule(COMPANY_MODULES.EXCHANGE_RATE),
];

const requireManagerContext = (req, res, next) => {
  if (req.context?.role !== "manager") {
    return next(
      new ApiError(
        403,
        "Only managers can update exchange rates",
        "EXCHANGE_RATE_MANAGER_REQUIRED",
      ),
    );
  }

  next();
};

const managerAccess = [...activeCompanyAccess, requireManagerContext];

router.get("/", activeCompanyAccess, catchAsync(getExchangeRate));
router.put("/", managerAccess, catchAsync(updateExchangeRate));

export default router;
