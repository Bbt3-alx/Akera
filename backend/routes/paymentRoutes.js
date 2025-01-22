import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import payForOperation from "../controllers/payForOperation.js";
import {
  createPayment,
  getOperationPayments,
  getPaymentHistories,
  generateReceipt,
  updatePayment,
  cancelPayment,
  getPayment,
} from "../controllers/paymentsController.js";

const router = express.Router();

// ROUTES TO MAKE A NEW PAYMENT
/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: API endpoints for managing payments.
 */

/**
 * @swagger
 * /api/v1/payments/new:
 *   post:
 *     summary: Make a new payment
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount to be paid
 *               method:
 *                 type: string
 *                 description: Payment method (e.g., credit card, cash, etc.)
 *               partnerId:
 *                 type: string
 *                 description: The ID of the partner being paid
 *               description:
 *                 type: string
 *                 description: Description of the payment
 *               totalAmount:
 *                 type: number
 *                 description: The total amount due
 *     responses:
 *       201:
 *         description: Payment created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Required fields missing or invalid amount.
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
 *                   example: "Required fields missing."
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
 *                   example: "Access denied, unauthorised."
 *       404:
 *         description: Partner not found.
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
 *                   example: "Partner not exist."
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
 *                   example: "Error creating payment: ..."
 */
router.post("/new", verifyToken, authorizeRoles("manager"), createPayment);

// ROUTES TO MAKE A PAYMENT FOR AN OPERATION
/**
 * @swagger
 * /api/v1/payments/operation/{operationId}/pay:
 *   post:
 *     summary: Pay for an operation
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: operationId
 *         in: path
 *         required: true
 *         description: The ID of the operation for which the payment is made
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount to be paid for the operation
 *               method:
 *                 type: string
 *                 description: Payment method used (e.g., credit card, bank transfer)
 *               partnerId:
 *                 type: string
 *                 description: The ID of the partner involved in the operation
 *     responses:
 *       200:
 *         description: Payment processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid payment amount or insufficient funds.
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
 *                   example: "Payment amount must be greater than zero."
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
 *                   example: "Access denied, unauthorized."
 *       404:
 *         description: Operation or partner not found.
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
 *                   example: "Partner not found."
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
 *                   example: "Error processing payment: ..."
 */
router.post(
  "/operations/:operationId/pay",
  verifyToken,
  authorizeRoles("manager"),
  payForOperation
);

// ROUTE TO GENERATE RECEIPT FOR A PAYMENT
/**
 * @swagger
 * /api/v1/payments/receipt/{paymentId}:
 *   get:
 *     summary: Generate a receipt for a payment
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: paymentId
 *         in: path
 *         required: true
 *         description: The ID of the payment to generate a receipt for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receipt generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 receipt:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                       description: The ID of the payment
 *                     operationId:
 *                       type: string
 *                       description: The operation associated with the payment
 *                     amount:
 *                       type: number
 *                       description: The amount paid
 *                     totalAmount:
 *                       type: number
 *                       description: The total amount for the operation
 *                     remain:
 *                       type: number
 *                       description: Remaining amount
 *                     date:
 *                       type: string
 *                       format: date-time
 *                       description: Date of the payment
 *                     method:
 *                       type: string
 *                       description: Payment method used
 *                     operationDetails:
 *                       type: object
 *                       description: Details of the associated operation
 *                     partner:
 *                       type: string
 *                       description: The partner involved in the payment
 *                     company:
 *                       type: string
 *                       description: The company related to the payment
 *       400:
 *         description: Invalid payment ID format.
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
 *                   example: "Invalid payment ID format."
 *       404:
 *         description: Payment not found.
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
 *                   example: "Payment not found."
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
 *                   example: "Error generating receipt: ..."
 */
router.post(
  "/receipt/:paymentId",
  verifyToken,
  authorizeRoles("manager"),
  generateReceipt
);

// ROUTE TO RETRIEVE ALL THE PAYMENT HISTORIES
/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Get all payment histories
 *     tags:
 *       - Payments
 *     responses:
 *       200:
 *         description: Payment histories retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
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
 *                   example: "Error fetching payment histories: ..."
 */
router.get("/", verifyToken, authorizeRoles("manager"), getPaymentHistories);

// ROUTE TO GET A SPECIFIC PAYMENT BY IT'S ID
/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     summary: Get a specific payment by ID
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: paymentId
 *         in: path
 *         required: true
 *         description: The ID of the payment to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid payment ID format.
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
 *                   example: "Invalid payment ID format."
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
 *                   example: "Access denied. Unauthorized."
 *       404:
 *         description: Payment not found.
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
 *                   example: "Payment not found."
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
 *                   example: "Error fetching payment: ..."
 */
router.get("/:paymentId", verifyToken, authorizeRoles("manager"), getPayment);

// ROUTE TO GET PAYMENT HYSTORIES FOR A SPECIFIC OPERATION
/**
 * @swagger
 * /api/v1/payments/operation/{operationId}:
 *   get:
 *     summary: Get payment histories of an operation
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: operationId
 *         in: path
 *         required: true
 *         description: The ID of the operation to retrieve payments for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment histories retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       404:
 *         description: No payments found for the operation.
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
 *                   example: "Payment not found."
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
 *                   example: "Error fetching payments: ..."
 */
router.get(
  "/operation/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  getOperationPayments
);

// ROUTE TO UPDATE A PAYMENT
/**
 * @swagger
 * /api/v1/payments/edit/{paymentId}:
 *   put:
 *     summary: Update a payment
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: paymentId
 *         in: path
 *         required: true
 *         description: The ID of the payment to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The updated amount to be paid
 *               method:
 *                 type: string
 *                 description: Updated payment method
 *               status:
 *                 type: string
 *                 description: Updated payment status
 *               totalAmount:
 *                 type: number
 *                 description: Updated total amount due
 *     responses:
 *       200:
 *         description: Payment updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 updatedPayment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid payment ID format or insufficient balance.
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
 *                   example: "Invalid payment ID format."
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
 *                   example: "Access denied. Unauthorized."
 *       404:
 *         description: Payment not found.
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
 *                   example: "Payment not found."
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
 *                   example: "Error updating payment: ..."
 */
router.put(
  "/edit/:paymentId",
  verifyToken,
  authorizeRoles("manager"),
  updatePayment
);

// ROUTE TO CANCEL A PAYMENT

/**
 * @swagger
 * /api/v1/payments/cancel/{paymentId}:
 *   delete:
 *     summary: Cancel a payment
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: paymentId
 *         in: path
 *         required: true
 *         description: The ID of the payment to cancel
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment cancelled successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 cancelledPayment:
 *                   $ref: '#/components/schemas/Payment'
 *                 message:
 *                   type: string
 *                   example: "Payment with ID {paymentId} successfully cancelled."
 *       400:
 *         description: Invalid payment ID format.
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
 *                   example: "Invalid payment ID format."
 *       403:
 *         description: Unauthorized access or action.
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
 *                   example: "Access denied. Unauthorized."
 *       404:
 *         description: Payment not found.
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
 *                   example: "Payment not found."
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
 *                   example: "Error cancelling payment."
 */
router.delete(
  "/cancel/:paymentId",
  verifyToken,
  authorizeRoles("manager"),
  cancelPayment
);

export default router;
