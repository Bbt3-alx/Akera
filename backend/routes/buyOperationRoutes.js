import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  createBuyOperation,
  deleteBuyOperation,
  getAllOperations,
  getOperation,
  updateOperation,
} from "../controllers/createBuyOperation.js";

const router = express.Router();

// ROUTE TO CREATE A NEW BUY OPERATION
/**
 * @swagger
 * tags:
 *   - name: Buy Operations
 *     description: API endpoints for managing buy operations
 */

/**
 * @swagger
 * /api/v1/operations/buy:
 *   post:
 *     summary: Create a new buy operation
 *     tags:
 *       - Buy Operations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gold:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     base:
 *                       type: number
 *                       description: The base price of gold
 *                     weight:
 *                       type: number
 *                       description: The weight of the gold
 *                     w_weight:
 *                       type: number
 *                       description: The weight of water used for density calculation
 *                     situation:
 *                       type: string
 *                       description: The situation or status of the gold
 *               partnerId:
 *                 type: string
 *                 description: The ID of the partner involved in the operation
 *               paymentStatus:
 *                 type: string
 *                 description: The payment status of the operation
 *               amountPaid:
 *                 type: number
 *                 description: The amount that has been paid
 *               currency:
 *                 type: string
 *                 example: "FCFA"
 *                 description: The currency in which the operation is conducted
 *             required:
 *               - gold
 *               - partnerId
 *               - currency
 *     responses:
 *       201:
 *         description: Buy operation created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 BuyOperationDetails:
 *                   $ref: '#/components/schemas/BuyOperation'
 *       400:
 *         description: Required fields missing or invalid input.
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
 *                   example: "Required fields missing for gold insertion."
 *       403:
 *         description: Access denied for unauthorized users.
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
 *                   example: "Access denied, unauthorized"
 *       404:
 *         description: Partner not found or invalid operation initiation.
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
 *                   example: "This operation cannot be initiated, partner not found."
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
 *                   example: "Error creating buy operation: ..."
 */
router.post("/buy", verifyToken, authorizeRoles("manager"), createBuyOperation);

// ROUTE TO RETRIEVES ALL BUY THE OPERATION
/**
 * @swagger
 * /api/v1/operations:
 *   get:
 *     summary: Retrieves all the buy operations
 *     tags:
 *       - Buy Operations
 *     responses:
 *       200:
 *         description: Operations retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 buyOperations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BuyOperation'
 *       204:
 *         description: No operations found.
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
 *                   example: "There are no operations yet."
 *       401:
 *         description: Unauthorized access or user does not have a company.
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
 *                   example: "Error fetching operations: ..."
 */
router.get("/", verifyToken, authorizeRoles("manager"), getAllOperations);

// ROUTE TO GET A SPECIFIC OPERATION
/**
 * @swagger
 * /api/v1/operations/{operationId}:
 *   get:
 *     summary: Get a buy operation by its ID
 *     tags:
 *       - Buy Operations
 *     parameters:
 *       - name: operationId
 *         in: path
 *         required: true
 *         description: The ID of the operation to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Operation retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 operation:
 *                   $ref: '#/components/schemas/BuyOperation'
 *       400:
 *         description: Invalid operation ID format.
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
 *                   example: "Invalid operation ID format."
 *       404:
 *         description: Operation not found.
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
 *                   example: "Operation not found."
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
 *                   example: "Error fetching operation: ..."
 */
router.get(
  "/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  getOperation
);

// ROUTE TO UPDATE AN OPERATION
/**
 * @swagger
 * /api/v1/operations/{operationId}:
 *   put:
 *     summary: Update an operation
 *     tags:
 *       - Buy Operations
 *     parameters:
 *       - name: operationId
 *         in: path
 *         required: true
 *         description: The ID of the operation to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               golds:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     weight:
 *                       type: number
 *                       description: The weight of the gold
 *                     w_weight:
 *                       type: number
 *                       description: The weight of water used for density calculation
 *                     base:
 *                       type: number
 *                       description: The base price of gold
 *                     situation:
 *                       type: string
 *                       description: The situation or status of the gold
 *               partnerId:
 *                 type: string
 *                 description: The ID of the partner involved in the operation
 *               paymentStatus:
 *                 type: string
 *                 description: The payment status of the operation
 *               amountPaid:
 *                 type: number
 *                 description: The amount that has been paid
 *               status:
 *                 type: string
 *                 description: The status of the operation
 *               currency:
 *                 type: string
 *                 description: The currency in which the operation is conducted
 *               situation:
 *                 type: string
 *                 description: The overall situation of the operation
 *     responses:
 *       200:
 *         description: Operation updated successfully.
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
 *                   example: "Operation with ID: {operationId} updated successfully."
 *       400:
 *         description: Invalid input or partner not found.
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
 *                   example: "Got an invalid karat, check your water or water weight."
 *       401:
 *         description: Access denied for unauthorized users.
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
 *         description: Operation not found.
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
 *                   example: "Operation not found."
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
 *                   example: "Error updating operation: ..."
 */
router.put(
  "/edit/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  updateOperation
);

// ROUTE TO DELETE AN OPERATION
/**
 * @swagger
 * /api/v1/operations/{operationId}:
 *   delete:
 *     summary: Delete an operation
 *     tags:
 *       - Buy Operations
 *     parameters:
 *       - name: operationId
 *         in: path
 *         required: true
 *         description: The ID of the operation to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Operation deleted successfully.
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
 *                   example: "Operation with ID {operationId} deleted successfully."
 *       400:
 *         description: Invalid operation ID format or operation ID is required.
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
 *                   example: "Invalid operation ID."
 *       403:
 *         description: Access denied or unauthorized operation.
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
 *                   example: "Operation failed, unauthorized."
 *       404:
 *         description: Operation not found.
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
 *                   example: "Operation not found."
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
 *                   example: "Error deleting operation: ..."
 */
router.delete(
  "/delete/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  deleteBuyOperation
);

export default router;
