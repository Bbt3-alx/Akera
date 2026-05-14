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
/**
 * @swagger
 * tags:
 *   - name: Transaction
 *     description: API endpoints for managing transactions
 */

/**
 * @swagger
 * /api/v1/transactions/:
 *   post:
 *     summary: Make a new transaction
 *     tags:
 *       - Transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount of the transaction (must be greater than 0)
 *               description:
 *                 type: string
 *                 description: A description for the transaction
 *               partnerId:
 *                 type: string
 *                 description: The ID of the partner involved in the transaction
 *             required:
 *               - amount
 *               - description
 *               - partnerId
 *     responses:
 *       201:
 *         description: Transaction created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "All fields are required"
 *       403:
 *         description: Invalid amount.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Amount must be a number and greater than 0."
 *       401:
 *         description: Unauthorized action or insufficient balance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You are not authorized to perform this operation."
 *       404:
 *         description: Partner not found or company not created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You don't have a company yet, create one first."
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error making transaction: ..."
 */
router.post(
  "/",
  audit("TRANSACTION_CREATE", "Transaction"),
  catchAsync(createTransaction),
);

router.post("/pay/:transactionCode", catchAsync(payTransaction));
router.get("/receipt/:id", downloadReceipt);
// ROUTE TO RETRIEVE ALL THE TRANSACTION BELONG TO A COMPANY
/**
 * @swagger
 * /api/v1/transactions:
 *   get:
 *     summary: Retrieve all transactions belonging to a company
 *     tags:
 *       - Transaction
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized action.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You are not authorized to perform this operation."
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error fetching transactions: ..."
 */
router.get("/", getTransactions);

// ROUTE TO RETRIEVE ALL TRANSACTIONS OF A PARTNER
/**
 * @swagger
 * /api/v1/transactions/partner/{id}:
 *   get:
 *     summary: Retrieve all transactions for a specific partner
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the partner whose transactions are retrieved
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner transactions retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized action.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You are not authorized to perform this operation."
 *       404:
 *         description: No transactions found for the partner.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "There is no transactions for this partner."
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error fetching partner transactions: ..."
 */
router.get("/mine", getPartnerTransactions);

// ROUTE TO GET A TRANSACTION BY ITS ID
/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   get:
 *     summary: Get specific transaction by its ID
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique ID of the transaction to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized action.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. You are not authorized."
 *       404:
 *         description: Transaction record not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Transaction record not found."
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error fetching transaction: ..."
 */
router.get("/id/:id", getTransaction);

// Get transaction by code
router.get("/code/:transactionCode", getTransactionByCode);

// ROUTE TO EDIT A TRANSACTION
/**
 * @swagger
 * /api/v1/transactions/{id}/edit/{id}:
 *   put:
 *     summary: Edit a transaction
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique ID of the transaction to edit
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the partner associated with the transaction
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 description: A new description for the transaction
 *               amount:
 *                 type: number
 *                 description: A new amount for the transaction (must be greater than 0)
 *             required:
 *               - description
 *               - amount
 *     responses:
 *       200:
 *         description: Transaction updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 updatedTransaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input or amount.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Amount must be a valid positive integer."
 *       401:
 *         description: Unauthorized action or insufficient balance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient balance to perform this operation."
 *       404:
 *         description: Transaction not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Transaction record not found."
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error editing transaction: ..."
 */
router.put(
  "/:id/edit",
  audit("TRANSACTION_UPDATE", "Transaction"),
  updateTransaction,
);

// ROUTE TO CANCEL A TRANSACTION
/**
 * @swagger
 * /api/v1/transactions/{id}/cancel:
 *   delete:
 *     summary: Delete a transaction
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique ID of the transaction to delete
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the partner associated with the transaction
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Transaction with ID {id} deleted successfully."
 *       401:
 *         description: Unauthorized access.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied, Unauthorized"
 *       404:
 *         description: Transaction or partner not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Transaction record not found."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error deleting transaction: ..."
 */
router.put(
  "/:transactionCode/cancel",
  audit("TRANSACTION_CANCEL", "Transaction"),
  catchAsync(cancelPendingTransaction),
);

// Route to reverse a completed transaction
router.post(
  "/:transactionCode/reverse",
  audit("TRANSACTION_REVERSE", "Transaction"),
  verifyToken,
  resolveCompanyContext,
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
