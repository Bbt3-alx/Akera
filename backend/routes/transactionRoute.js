import {
  editTransaction,
  getPartnerTransaction,
  getTransactions,
  getTransaction,
  makeTransaction,
  deleteTransaction,
} from "../controllers/manageTransaction.js";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import express from "express";

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
 * /api/transactions/new:
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
router.post("/new", verifyToken, authorizeRoles("manager"), makeTransaction);

// ROUTE TO RETRIEVE ALL THE TRANSACTION BELONG TO A COMPANY
/**
 * @swagger
 * /api/transactions:
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
router.get("/", verifyToken, authorizeRoles("manager"), getTransactions);

// ROUTE TO RETRIEVE ALL TRANSACTIONS OF A PARTNER
/**
 * @swagger
 * /api/transactions/partner/{partnerId}:
 *   get:
 *     summary: Retrieve all transactions for a specific partner
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: partnerId
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
  "/partner/:partnerId",
  verifyToken,
  authorizeRoles("manager"),
  getPartnerTransaction
);

// ROUTE TO GET A TRANSACTION BY ITS ID
/**
 * @swagger
 * /api/transactions/{transactionId}:
 *   get:
 *     summary: Get specific transaction by its ID
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: transactionId
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
  "/:transactionId",
  verifyToken,
  authorizeRoles("manager"),
  getTransaction
);

// ROUTE TO EDIT A TRANSACTION
/**
 * @swagger
 * /api/transactions/{transactionId}/edit/{partnerId}:
 *   put:
 *     summary: Edit a transaction
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: transactionId
 *         in: path
 *         required: true
 *         description: The unique ID of the transaction to edit
 *         schema:
 *           type: string
 *       - name: partnerId
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
  "/:transactionId/edit/:partnerId",
  verifyToken,
  authorizeRoles("manager"),
  editTransaction
);
export default router;

// ROUTE TO DELETE A TRANSACTION
/**
 * @swagger
 * /api/transactions/{transactionId}/partner/{partnerId}:
 *   delete:
 *     summary: Delete a transaction
 *     tags:
 *       - Transaction
 *     parameters:
 *       - name: transactionId
 *         in: path
 *         required: true
 *         description: The unique ID of the transaction to delete
 *         schema:
 *           type: string
 *       - name: partnerId
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
 *                   example: "Transaction with ID {transactionId} deleted successfully."
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
router.delete(
  "/:transactionId/partner/:partnerId",
  verifyToken,
  authorizeRoles("manager"),
  deleteTransaction
);
