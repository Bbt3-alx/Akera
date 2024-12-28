import { Router } from "express";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import verifyToken from "../middlewares/protectedRoutes.js";
import isValidRole from "../middlewares/isValideRole.js";
import {
  signup,
  login,
  verifyEmail,
  logout,
  forgotPassword,
  resetPassword,
  verifyAuth,
} from "../controllers/authControllers.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", isValidRole, login);
router.post("/verify-email", verifyEmail);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/verify-auth", verifyToken, verifyAuth);
export default router;
