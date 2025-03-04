import bcrypt from "bcryptjs";
import crypto from "crypto";
import { configDotenv } from "dotenv";

import validateSignupInput from "../validations/validateSignupInput.js";
import User from "../models/User.js";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendResetSuccessEmail,
} from "../mail/mails.js";
import mongoose from "mongoose";

configDotenv();

// Signup
export const signup = async (req, res) => {
  const { email, password, name, roles } = req.body;
  try {
    // Input validation
    try {
      validateSignupInput(email, password, name, roles);
    } catch (error) {
      console.log(error);
      return res.status(422).json({ success: false, message: error.message });
    }

    const userAlreadyExist = await User.findOne({ email });
    if (userAlreadyExist) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // Default role
    const defaultRole = "partner";
    let userRoles = [defaultRole];

    if (roles) {
      userRoles = [...new Set([...userRoles, ...roles])]; // Combine and remove duplicates roles
    }

    // Hash the password before store it to the db
    const hashedPassword = await bcrypt.hash(password, 10);

    // Let's generate a verification code
    const verificationToken = Math.floor(
      100000 + Math.random() * 90000
    ).toString();

    // Now store user inputs to the db
    const newUser = User({
      email,
      password: hashedPassword,
      name,
      roles: userRoles,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    await newUser.save();

    // jwt
    generateTokenAndSetCookie(res, newUser._id);

    if (process.env.VITE_NODE_ENV === "production") {
      await sendVerificationEmail(newUser.email, verificationToken);
    }

    res.status(201).json({
      success: true,
      code: 201,
      message: "User created. Verify your email.",
      user: { id: newUser._id, email, name },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

// Email verification
export const verifyEmail = async (req, res) => {
  // verify the user email
  const { code } = req.body;

  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Invalide or expired verification code.",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Generate token only after verification
    generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Email verified!",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Server error",
    });
  }
};

// Login controller
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Email and password required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Generic error to avoid leaking user existence
      return res.status(401).json({
        success: false,
        code: 401,
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Verify your email first",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // Generate token with all user roles
    generateTokenAndSetCookie(res, user._id, user.roles, user.company);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Logged in successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        company: user.company,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Internal server error",
    });
  }
};

// Logout controller
export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({
    success: true,
    code: 200,
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Invalid email format.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: "If the email exists, a reset link will be sent",
      });
    }

    const pwdResetToken = crypto.randomBytes(20).toString("hex");
    const resetPwdExp = Date.now() + 3600000; // 1 hour

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      user.resetPasswordToken = pwdResetToken;
      user.resetPasswordExpiresAt = resetPwdExp;

      user.save({ session });

      // Send the reset email
      await sendResetPasswordEmail(
        user.email,
        `${process.env.CLIENT_URL}/reset-password/${pwdResetToken}`
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Reset link sent if email exists",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Server error",
    });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    // Validate password strenght
    if (password.length < 8) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Password must be 8+ characters",
      });
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });
    // Check if the token is valide
    if (!user) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Invalide or expired token",
      });
    }

    //Check if the new password must old
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "New password must differ from old.",
      });
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Update the password and invalidate the token
      user.password = await bcrypt.hash(password, 12);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiresAt = undefined;
      user.tokenVersion += 1; // Invalidate existing sessions
      await user.save({ session });

      await sendResetSuccessEmail(user.email);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    res
      .status(200)
      .json({ satus: true, code: 200, message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Server error",
    });
  }
};

export const verifyAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ status: false, code: 404, message: "User not found" });
    }

    // If the user exists, return their information
    // (excluding sensitive data like the password)
    res.status(200).json({
      success: true,
      code: 200,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Server error",
    });
  }
};
