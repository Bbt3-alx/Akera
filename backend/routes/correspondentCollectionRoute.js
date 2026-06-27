import express from "express";

import {
  cancelCollection,
  confirmCollection,
  createCollection,
  getCollection,
  listCollections,
} from "../controllers/correspondentCollection.controller.js";
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
  audit("CORRESPONDENT_COLLECTION_CREATE", "CorrespondentCollection"),
  catchAsync(createCollection),
);

router.get("/", activeCompanyAccess, catchAsync(listCollections));

router.get("/:collectionCode", activeCompanyAccess, catchAsync(getCollection));

router.post(
  "/:collectionCode/confirm",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("CORRESPONDENT_COLLECTION_CONFIRM", "CorrespondentCollection"),
  catchAsync(confirmCollection),
);

router.post(
  "/:collectionCode/cancel",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("CORRESPONDENT_COLLECTION_CANCEL", "CorrespondentCollection"),
  catchAsync(cancelCollection),
);

export default router;
