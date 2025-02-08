import {
  updateTransaction,
  getPartnerTransactions,
  getTransactions,
  getTransaction,
  createTransaction,
  deleteTransaction,
  restoreTransaction,
} from "../controllers/manageTransaction.js";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import express from "express";
import { validateTransactionInput } from "../middlewares/validators.js";
import { cache } from "../middlewares/cache.js";
import { audit } from "../middlewares/audit.js";
const router = express.Router();

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
  verifyToken,
  authorizeRoles("manager"),
  validateTransactionInput,
  audit("TRANSACTION_CREATE", "Transaction"),
  createTransaction
);

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
router.get(
  "/",
  verifyToken,
  authorizeRoles("manager"),
  cache("transactions", 3600),
  getTransactions
);

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
router.get(
  "/partner/:id",
  verifyToken,
  authorizeRoles("manager"),
  cache("partnerTransactions", 3600),
  getPartnerTransactions
);

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
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  cache("transaction", 3600),
  getTransaction
);

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
  verifyToken,
  authorizeRoles("manager"),
  audit("TRANSACTION_UPDATE", "Transaction"),
  updateTransaction
);
export default router;

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
  "/:id/cancel",
  verifyToken,
  authorizeRoles("manager"),
  audit("TRANSACTION_DELETE", "Transaction"),
  deleteTransaction
);

// ROUTE TO RESTORE A TRANSACTION
router.put(
  "/:id/restore",
  verifyToken,
  authorizeRoles("manager"),
  audit("TRANSACTION_RESTORE", "Transaction"),
  restoreTransaction
);
