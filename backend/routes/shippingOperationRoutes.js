import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizedRoles from "../middlewares/roleAuthorization.js";
import {
  getShipmentHistory,
  getShipment,
  createShippingOperation,
  updateShippingOperation,
  deleteShippingOperation,
} from "../controllers/manageShipment.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import { cache } from "../middlewares/cache.js";
import { ROLES } from "../constants/roles.js";
import { audit } from "../middlewares/audit.js";

const router = express.Router();

// ROUTE TO MAKE A NEW SHIPMENT
/**
 * @swagger
 * /api/v1/shipments/{id}:
 *   post:
 *     summary: Create a new shipping operation
 *     tags:
 *       - Shipping
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the operation to create a shipment for
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transport:
 *                 type: number
 *                 description: The transport fee per gram (default is 150)
 *     responses:
 *       201:
 *         description: Shipment created successfully.
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
 *                   example: "Shipped successfully."
 *                 shipment:
 *                   $ref: '#/components/schemas/ShippingOperation'
 *       400:
 *         description: Invalid transport fee or calculated fees.
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
 *                   example: "Invalid transport fee."
 *       403:
 *         description: Access denied.
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
 *                   example: "Access denied."
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
 *                   example: "Error creating shipment: ..."
 */
router.post(
  "/ship/:id",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("CREATE", "ShipmentOperation"),
  createShippingOperation
);

// ROUTE TO GET ALL THE SHIPMENTS
/**
 * @swagger
 * /api/v1/shipments/history:
 *   get:
 *     summary: Get all shipping histories of a company
 *     tags:
 *       - Shipping
 *     responses:
 *       200:
 *         description: Shipping history retrieved successfully.
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
 *                   example: "Shipping history retrieved successfully."
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShippingOperation'
 *       404:
 *         description: No shipping history found.
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
 *                   example: "No shipping history found."
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
 *                   example: "Error retrieving shipping history: ..."
 */
router.get(
  "/",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  cache("Shipments", 3600),
  getShipmentHistory
);

// ROUTE TO GET A SINGLE SHIPMENT
/**
 * @swagger
 * /api/v1/shipments/{id}:
 *   get:
 *     summary: Get a single shipment by its ID
 *     tags:
 *       - Shipping
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the shipment to retrieve
 *         schema:
 *           $ref: '#/components/schemas/ShippingOperation'
 *     responses:
 *       200:
 *         description: Shipment retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 shipment:
 *                   $ref: '#/components/schemas/ShippingOperation'
 *       403:
 *         description: Access denied.
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
 *         description: Shipment record not found.
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
 *                   example: "Shipment record not found."
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
 *                   example: "Error retrieving shipment: ..."
 */
router.get(
  "/:id",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  getShipment
);

// ROUTE TO UPDATE A SHIPMENT

/**
 * @swagger
 * /api/v1/shipments/{id}:
 *   put:
 *     summary: Update a shipment
 *     tags:
 *       - Shipping
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the shipment to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: The new status for the shipment (e.g., shipped, pending)
 *     responses:
 *       200:
 *         description: Shipment updated successfully.
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
 *                   example: "Shipment status changed to pending."
 *                 updatedShipment:
 *                   $ref: '#/components/schemas/ShippingOperation'
 *       403:
 *         description: Access denied.
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
 *         description: Shipment record not found.
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
 *                   example: "Shipment record not found."
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
 *                   example: "Error updating shipment: ..."
 */
router.put(
  "/:id",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("UPDATE", "ShipmentOperation"),
  updateShippingOperation
);

//ROUTE TO DELETE A SHIPMENT
/**
 * @swagger
 * /api/v1/shipments/{id}:
 *   delete:
 *     summary: Delete a shipment
 *     tags:
 *       - Shipping
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the shipment to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipment deleted successfully.
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
 *                   example: "Shipment with ID {id} deleted successfully."
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
 *       404:
 *         description: Shipment record not found.
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
 *                   example: "Shipment record not found."
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
 *                   example: "Error deleting shipment: ..."
 */
router.delete(
  "/cancel/:id",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("DELETE", "ShipmentOperation"),
  deleteShippingOperation
);
export default router;
