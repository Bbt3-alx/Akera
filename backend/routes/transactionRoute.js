import {
  createTransaction,
  payTransaction,
  cancelPendingTransaction,
  reverseCompletedTransaction,
  getMyTransactions,
  getTransactions,
  getTransactionById,
  getTransactionByCode,
  getTrialBalance,
  legacyTransactionRouteDisabled,
} from "../controllers/transaction.controller.js";
import { downloadReceipt } from "../controllers/receipt.controller.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import verifyToken from "../middlewares/verifyToken.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import express from "express";
import { audit } from "../middlewares/audit.js";
import verifyTransactionPin from "../middlewares/verifyTransactionPin.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireVerifiedUser);
router.use(resolveCompanyContext);

// ROUTE TO MAKE A NEW TRANSACTION

router.post(
  "/",
  audit("TRANSACTION_CREATE", "Transaction"),
  catchAsync(createTransaction),
);

router.post(
  "/pay/:transactionCode",
  audit("TRANSACTION_PAY", "Transaction"),
  catchAsync(payTransaction),
);
router.get("/receipt/:id", catchAsync(downloadReceipt));
// ROUTE TO RETRIEVE ALL THE TRANSACTION BELONG TO A COMPANY
router.get("/", catchAsync(getTransactions));

// ROUTE TO RETRIEVE ALL TRANSACTIONS OF A PARTNER
router.get("/mine", catchAsync(getMyTransactions));

// ROUTE TO GET A TRANSACTION BY ITS ID
router.get("/id/:id", catchAsync(getTransactionById));

// Get transaction by code
router.get("/code/:transactionCode", catchAsync(getTransactionByCode));

// ROUTE TO EDIT A TRANSACTION
router.put("/:id/edit", legacyTransactionRouteDisabled);

// ROUTE TO CANCEL A TRANSACTION
router.put(
  "/:transactionCode/cancel",
  audit("TRANSACTION_CANCEL", "Transaction"),
  catchAsync(cancelPendingTransaction),
);

// Route to reverse a completed transaction
router.post(
  "/:transactionCode/reverse",
  audit("TRANSACTION_REVERSE", "Transaction"),
  verifyTransactionPin,
  catchAsync(reverseCompletedTransaction),
);

// ROUTE TO RESTORE A TRANSACTION
router.put("/:id/restore", legacyTransactionRouteDisabled);

router.get("/trial-balance", catchAsync(getTrialBalance));
export default router;
