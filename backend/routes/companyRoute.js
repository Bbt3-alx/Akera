import express from "express";
import { createCompany, myCompanies } from "../controllers/createCompany.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import verifyToken from "../middlewares/verifyToken.js";
import { searchCompany } from "../utils/searchAutoCompletion.js";

const router = express.Router();

router.post(
  "/create-company",
  verifyToken,
  authorizeRoles("admin", "manager"),
  createCompany
);
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "manager"),
  myCompanies
);

// Route to find companies by name
router.get("/search", verifyToken, searchCompany);

export default router;
