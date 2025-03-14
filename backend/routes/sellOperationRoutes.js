import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  createSellOperation,
  deleteSellOperation,
  getSellOperation,
  getSellOperations,
  updateSellOperation,
} from "../controllers/sellOperationController.js";
import { audit } from "../middlewares/audit.js";
import { catchAsync } from "../middlewares/errorHandler.js";
const router = express.Router();

//ROUTE TO CREATE A NEW SELL OPERATION
/**
 * @swagger
 * /api/v1/sells:
 *   post:
 *     summary: Create a new sell operation
 *     tags:
 *       - Sell Operations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *                 description: The weight of the product sold
 *               rate:
 *                 type: number
 *                 description: The selling price per unit of weight
 *               unit:
 *                 type: string
 *                 description: The unit of weight (e.g., "grams", "ounces")
 *     responses:
 *       201:
 *         description: Sell operation created successfully.
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
 *                   example: "{weight} {unit} sold successfully."
 *                 savedSell:
 *                   $ref: '#/components/schemas/SellOperation'
 *       403:
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
 *                   example: "Something went wrong."
 */
router.post(
  "/",
  verifyToken,
  authorizeRoles("manager"),
  audit("CREATE", "SellOperation"),
  createSellOperation
);

// ROUTE TO RETRIEVES ALL THE SELLS OPERATION
/**
 * @swagger
 * /api/v1/sells:
 *   get:
 *     summary: Retrieve all sell operations
 *     tags:
 *       - Sell Operations
 *     responses:
 *       200:
 *         description: Sales retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SellOperation'
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
 *                   example: "Something went wrong."
 */
router.get("/", verifyToken, authorizeRoles("manager"), getSellOperations);

// ROUTE TO GET A SPECIFIC SELL OPERATION BY ID
/**
 * @swagger
 * /api/v1/sells/{id}:
 *   get:
 *     summary: Get a specific sell operation by ID
 *     tags:
 *       - Sell Operations
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the sell operation to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sell operation retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sellOperation:
 *                   $ref: '#/components/schemas/SellOperation'
 *       404:
 *         description: Sell operation not found.
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
 *                   example: "Sell not found."
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
 *                   example: "Something went wrong."
 */
router.get("/:id", verifyToken, authorizeRoles("manager"), getSellOperation);

//ROUTE TO UPDATE A SELL
/**
 * @swagger
 * /api/v1/sells/{id}:
 *   put:
 *     summary: Update a sell operation
 *     tags:
 *       - Sell Operations
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the sell operation to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rate:
 *                 type: number
 *                 description: The updated selling price per unit of weight
 *               weight:
 *                 type: number
 *                 description: The updated weight of the product sold
 *               unit:
 *                 type: string
 *                 description: The unit of weight (e.g., "grams", "ounces")
 *     responses:
 *       200:
 *         description: Sell operation updated successfully.
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
 *                   example: "{weight} {unit} sold successfully."
 *                 updatedSell:
 *                   $ref: '#/components/schemas/SellOperation'
 *       404:
 *         description: Sell operation not found.
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
 *                   example: "Sell operation not found."
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
 *                   example: "Something went wrong."
 */
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  audit("UPDATE", "SellOperation"),
  updateSellOperation
);

// ROUTE TO DELETE A SELL
/**
 * @swagger
 * /api/v1/sells/{id}:
 *   delete:
 *     summary: Delete a specific sell operation
 *     tags:
 *       - Sell Operations
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the sell operation to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sell operation deleted successfully.
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
 *                   example: "Sell with ID {id} deleted successfully."
 *       404:
 *         description: Sell operation not found.
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
 *                   example: "Sell operation not found."
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
 *                   example: "Something went wrong."
 */
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  audit("DELETE", "SellOperation"),
  deleteSellOperation
);

export default router;
