import { Router } from "express";
import verifyToken from "../middlewares/verifyToken.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import {
  signup,
  login,
  verifyEmail,
  resendVerification,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", catchAsync(signup));

router.post("/verify-email", catchAsync(verifyEmail));

router.post("/resend-verification", catchAsync(resendVerification));

router.post("/login", catchAsync(login));

router.get("/me", verifyToken, catchAsync(getMe));

router.post("/logout", logout);

router.post("/forgot-password", catchAsync(forgotPassword));

router.post("/reset-password/:token", catchAsync(resetPassword));

export default router;
