import express from "express";
import {
  createCompany,
  getCompanyProfile,
  updateCompany,
  getCompanies,
} from "../controllers/createCompany.js";
import {
  validateCompanyId,
  validateCompanyUpdate,
} from "../middlewares/validators.js";
import { paginate } from "../middlewares/pagination.js";
import { audit } from "../middlewares/audit.js";
import { companyCreationLimiter } from "../middlewares/rateLimit.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import verifyToken from "../middlewares/verifyToken.js";
import { softDeleteCompany } from "../controllers/createCompany.js";
import { searchCompany } from "../utils/searchAutoCompletion.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Company
 *     description: API endpoints for managing companies
 */

/**
 * @swagger
 * /api/v1/companies:
 *   post:
 *     summary: Create a new company
 *     tags:
 *       - Company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the company
 *               address:
 *                 type: string
 *                 description: The physical address of the company
 *               contact:
 *                 type: string
 *                 description: The contact information (phone/email) of the company
 *               balance:
 *                  type: integer
 *                  description: The partner's balance
 *             required:
 *               - name
 *               - address
 *               - contact
 *     responses:
 *       201:
 *         description: Company created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 company:
 *                   $ref: '#/components/schemas/Company'
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
 *                   example: "Missing required fields."
 *       403:
 *         description: A company already exists with this contact.
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
 *                   example: "A company already exists with this contact."
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
 *                   example: "Error creating company: ..."
 */
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "manager"),
  companyCreationLimiter,
  createCompany
);

/**
 * @swagger
 * /api/v1/companies/{id}:
 *   get:
 *     summary: Get company details
 *     tags:
 *       - Company
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the company
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company found successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 company:
 *                   $ref: '#/components/schemas/Company'
 *       404:
 *         description: No company found with the given ID.
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
 *                   example: "No company found"
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
 *                   example: "Error retrieving company: ..."
 */
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "manager"),
  getCompanyProfile
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("manager"),
  paginate(),
  getCompanies
);

// Update company
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  validateCompanyId,
  validateCompanyUpdate,
  audit("Update", "Company"),
  updateCompany
);

// Soft delete a company
router.put(
  "/delete/:id",
  verifyToken,
  authorizeRoles("manager"),
  audit("Soft Delete", "Company"),
  softDeleteCompany
);
export default router;
