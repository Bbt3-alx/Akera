import express from "express";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import { addPartner, myPartners } from "../controllers/managePartner.js";
import verifyToken from "../middlewares/verifyToken.js";
import { updatePartner } from "../controllers/managePartner.js";

const router = express.Router();

// ROUTE TO CREATE A NEW COMPUTER
router.post(
  "/create-partner",
  verifyToken,
  authorizeRoles("admin", "manager"),
  addPartner
);

// ROUTE TO RETRIEVES ALL THE PARTNER BELONG TO A COMPANY
router.get("/", verifyToken, myPartners);

// ROUTE TO UPDATE A SPECIFIC PARTNER
router.patch("/:partnerId", verifyToken, updatePartner);

export default router;
