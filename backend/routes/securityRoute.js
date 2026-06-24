import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { audit } from "../middlewares/audit.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import { transactionPinLimiter } from "../middlewares/transactionPinRateLimit.js";
import {
    changeTransactionPin,
    getTransactionPinStatus,
    setupTransactionPin,
} from "../controllers/security.controller.js";

const router = express.Router();

const activeUserSecurityAccess = [
    verifyToken,
    requireVerifiedUser,
    resolveCompanyContext,
];

router.get(
    "/transaction-pin/status",
    activeUserSecurityAccess,
    catchAsync(getTransactionPinStatus),
);

router.post(
    "/transaction-pin/setup",
    activeUserSecurityAccess,
    transactionPinLimiter,
    audit("SECURITY_TRANSACTION_PIN_SETUP", "User"),
    catchAsync(setupTransactionPin),
);

router.patch(
    "/transaction-pin/change",
    activeUserSecurityAccess,
    transactionPinLimiter,
    audit("SECURITY_TRANSACTION_PIN_CHANGE", "User"),
    catchAsync(changeTransactionPin),
);

// Legacy setup route kept as an alias to the canonical transaction-pin setup flow.
router.post(
    "/setup-transaction-pin",
    activeUserSecurityAccess,
    transactionPinLimiter,
    audit("SECURITY_TRANSACTION_PIN_SETUP", "User"),
    catchAsync(setupTransactionPin),
);

export default router;
