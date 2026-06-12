import {
  updateTransaction,
  getPartnerTransactions,
  getTransactions,
  getTransaction,
  deleteTransaction,
  restoreTransaction,
  getTransactionByCode,
} from "../controllers/manageTransaction.js";
import {
  createTransaction,
  payTransaction,
  cancelPendingTransaction,
  reverseCompletedTransaction,
} from "../controllers/transaction.controller.js";
import { downloadReceipt } from "../controllers/receipt.controller.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import verifyToken from "../middlewares/verifyToken.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import express from "express";
import { cache } from "../middlewares/cache.js";
import { audit } from "../middlewares/audit.js";
import { trialBalance } from "../controllers/accounting.controller.js";
import verifyTransactionPin from "../middlewares/verifyTransactionPin.js";

const router = express.Router();

router.use(verifyToken);
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
router.get("/receipt/:id", downloadReceipt);
// ROUTE TO RETRIEVE ALL THE TRANSACTION BELONG TO A COMPANY
router.get("/", getTransactions);

// ROUTE TO RETRIEVE ALL TRANSACTIONS OF A PARTNER
router.get("/mine", getPartnerTransactions);

// ROUTE TO GET A TRANSACTION BY ITS ID
router.get("/id/:id", getTransaction);

// Get transaction by code
router.get("/code/:transactionCode", getTransactionByCode);

// ROUTE TO EDIT A TRANSACTION
router.put(
  "/:id/edit",
  audit("TRANSACTION_UPDATE", "Transaction"),
  updateTransaction,
);

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
router.put(
  "/:id/restore",
  audit("TRANSACTION_RESTORE", "Transaction"),
  restoreTransaction,
);

router.get("/trial-balance", catchAsync(trialBalance));
export default router;
