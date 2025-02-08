import express from "express";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  addPartner,
  getPartners,
  getPartnerBalance,
  removePartner,
  getPartner,
  restorePartner,
} from "../controllers/managePartner.js";
import { audit } from "../middlewares/audit.js";
import verifyToken from "../middlewares/verifyToken.js";
import { updatePartner } from "../controllers/managePartner.js";
import { paginate } from "../middlewares/pagination.js";
import { validatePartnerId } from "../middlewares/validators.js";
import { ROLES } from "../constants/roles.js";
import { cache } from "../middlewares/cache.js";

const router = express.Router();

// ROUTE TO CREATE A NEW COMPUTER
/**
 * @swagger
 * tags:
 *   - name: Partner
 *     description: API endpoints for managing partners
 */

/**
 * @swagger
 * /api/v1/partners/new:
 *   post:
 *     summary: Create a new partner
 *     tags:
 *       - Partner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the partner.
 *               phone:
 *                 type: string
 *                 description: The partner's phone number.
 *               email:
 *                 type: string
 *                 description: The partner's email address.
 *               balance:
 *                 type: number
 *                 description: Initial balance for the partner.
 *             required:
 *               - name
 *               - phone
 *     responses:
 *       201:
 *         description: Partner created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 partner:
 *                   $ref: '#/components/schemas/Partner'
 *       400:
 *         description: Missing required fields or invalid email.
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
 *                   example: "Missing required fields."
 *       409:
 *         description: Partner already exists in the company.
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
 *                   example: "Partner already in your list."
 *       404:
 *         description: Company not found.
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
 *                   example: "Company not found."
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
 *                   example: "Error creating partner: ..."
 */
router.post(
  "/new",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  addPartner
);

// ROUTE TO RETRIEVES ALL THE PARTNER BELONG TO A COMPANY
/**
 * @swagger
 * /api/v1/partners:
 *   get:
 *     summary: Get the partner list for the logged-in manager
 *     tags:
 *       - Partner
 *     responses:
 *       200:
 *         description: Partners retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 partners:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Partner'
 *       404:
 *         description: No partners found or manager not found.
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
 *                   example: "No partner found for this company."
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
 *                   example: "Error fetching partners: ..."
 */
router.get(
  "/",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  cache("partners", 60),
  paginate(),
  getPartners
);

// ROUTE TO GET A SPECIFIC PARTNER BY ITS ID
/**
 * @swagger
 * /api/v1/partners/{id}:
 *   get:
 *     summary: Get a specific partner by its ID
 *     tags:
 *       - Partner
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique ID of the partner to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 partner:
 *                   $ref: '#/components/schemas/Partner'
 *       401:
 *         description: Unauthorized action or partner not owned.
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
 *                   example: "You can only get your own partners."
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
 *                   example: "This partner no longer exists."
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
 *                   example: "Error fetching partner: ..."
 */
router.get(
  "/:id",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getPartner
);

// ROUTE TO UPDATE A SPECIFIC PARTNER
/**
 * @swagger
 * /api/v1/partners/{id}/update:
 *   put:
 *     summary: Update a partner's details
 *     tags:
 *       - Partner
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the partner to be updated
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the partner
 *               phone:
 *                 type: string
 *                 description: The partner's phone number
 *               email:
 *                 type: string
 *                 description: The partner's email address
 *               balance:
 *                 type: integer
 *                 description: The partner's balance
 *     responses:
 *       200:
 *         description: Partner updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 partner:
 *                   $ref: '#/components/schemas/Partner'
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
 *                   example: "Partner not found"
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
 *                   example: "Error updating partner: ..."
 */
router.put(
  "/:id/update/",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validatePartnerId,
  audit("UPDATE", "Partner"),
  updatePartner
);

// ROUTE TO GET A PERTNER'S BALANCE
/**
 * @swagger
 * /api/v1/partners/{id}/balance:
 *   get:
 *     summary: Get balances for a specific partner
 *     tags:
 *       - Partner
 *     responses:
 *       200:
 *         description: Partner balance retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 balance:
 *                   type: integer
 *                   description: The balance of the specified partner
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
 *                   example: "You can only see your partner balance."
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
 *                   example: "Partner doesn't exist anymore."
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
 *                   example: "Error fetching partner balance: ..."
 */
router.get(
  "/:id/balance",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validatePartnerId,
  getPartnerBalance
);

// Remove a partner
/**
 * @swagger
 * /api/v1/partners/{id}/remove:
 *   delete:
 *     summary: Remove a partner from the company
 *     tags:
 *       - Partner
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the partner to be removed
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner removed successfully.
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
 *                   example: "Partner removed successfully!"
 *                 removedPartner:
 *                   $ref: '#/components/schemas/Partner'
 *       401:
 *         description: Unauthorized action or partner not owned.
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
 *                   example: "You can only remove your partner."
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
 *                   example: "We can't find any partner with this id."
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
 *                   example: "Error removing partner: ..."
 */
router.put(
  "/:id/remove",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validatePartnerId,
  audit("DELETE", "Partner"),
  removePartner
);

// RESTORE PARTNER
router.put(
  "/:id/restore",
  verifyToken,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validatePartnerId,
  audit("RESTORE", "Partner"),
  restorePartner
);
export default router;
