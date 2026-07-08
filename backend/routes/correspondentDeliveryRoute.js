import express from "express";

import {
  cancelDelivery,
  cancelDeliveryById,
  confirmDelivery,
  confirmDeliveryById,
  createDelivery,
  getDelivery,
  listDeliveries,
} from "../controllers/correspondentDelivery.controller.js";
import {
  createDeliveryModificationRequest,
} from "../controllers/correspondentModificationRequest.controller.js";
import {
  COMPANY_MODULES,
  TRANSFER_WORKFLOWS,
} from "../constants/companyModules.js";
import { audit } from "../middlewares/audit.js";
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

router.post(
  "/",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("CORRESPONDENT_DELIVERY_CREATE", "CorrespondentDelivery"),
  catchAsync(createDelivery),
);

router.get("/", activeCompanyAccess, catchAsync(listDeliveries));

router.post(
  "/id/:deliveryId/confirm",
  activeCompanyAccess,
  verifyTransactionPin,
  audit("CORRESPONDENT_DELIVERY_CONFIRM", "CorrespondentDelivery"),
  catchAsync(confirmDeliveryById),
);

router.post(
  "/id/:deliveryId/cancel",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("CORRESPONDENT_DELIVERY_CANCEL", "CorrespondentDelivery"),
  catchAsync(cancelDeliveryById),
);

router.post(
  "/id/:deliveryId/modification-requests",
  activeCompanyAccess,
  catchAsync(createDeliveryModificationRequest),
);

router.get("/:deliveryCode", activeCompanyAccess, catchAsync(getDelivery));

router.post(
  "/:deliveryCode/confirm",
  activeCompanyAccess,
  verifyTransactionPin,
  audit("CORRESPONDENT_DELIVERY_CONFIRM", "CorrespondentDelivery"),
  catchAsync(confirmDelivery),
);

router.post(
  "/:deliveryCode/cancel",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("CORRESPONDENT_DELIVERY_CANCEL", "CorrespondentDelivery"),
  catchAsync(cancelDelivery),
);

export default router;
