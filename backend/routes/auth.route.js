import { Router } from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  signup,
  login,
  verifyEmail,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", signup);

router.post("/verify-email", verifyEmail);

router.post("/login", login);

router.get("/me", verifyToken, getMe);

router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password/:token", resetPassword);

export default router;
