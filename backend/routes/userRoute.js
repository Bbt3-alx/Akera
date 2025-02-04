import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";

const router = express.Router();

router.get("/admin", verifyToken, authorizeRoles("admin"), (req, res) => {
  res.send(`welcome you are connected as ${req.user.role}: ${req.user.id}`);
});
router.get(
  "/manager",
  verifyToken,
  authorizeRoles("admin", "manager"),
  (req, res) => {
    res.send(`welcome you are connected as ${req.user.role}: ${req.user.id}`);
  }
);
router.get(
  "/user",
  verifyToken,
  authorizeRoles("admin", "manager", "partner"),
  (req, res) => {
    res.send(`welcome you are connected as ${req.user.role}: ${req.user.id}`);
  }
);

router.get(
  "/partner",
  verifyToken,
  authorizeRoles("admin", "manager", "partner"),
  (req, res) => {
    res.send(`welcome you are connected as ${req.user.role}: ${req.user.id}`);
  }
);

export default router;
