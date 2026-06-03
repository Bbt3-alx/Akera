import bcrypt from "bcryptjs";
import crypto from "crypto";
import { configDotenv } from "dotenv";

import validateSignupInput from "../validations/validateSignupInput.js";
import User from "../models/User.js";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";
import { ApiError } from "../middlewares/errorHandler.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendResetSuccessEmail,
} from "../mail/mails.js";
import mongoose from "mongoose";

configDotenv();

const buildSignupProfile = ({ firstname, lastname, name, phone }) => {
  const trimmedFirstname = firstname?.trim();
  const trimmedLastname = lastname?.trim();
  const trimmedName = name?.trim();

  if (trimmedFirstname && trimmedLastname) {
    return {
      firstname: trimmedFirstname,
      lastname: trimmedLastname,
      phone,
    };
  }

  const [firstNamePart, ...lastNameParts] = trimmedName?.split(/\s+/) || [];

  return {
    firstname: firstNamePart,
    lastname: lastNameParts.join(" ") || firstNamePart,
    phone,
  };
};

const formatUserIdentity = (user) => ({
  id: user._id,
  email: user.email,
  firstname: user.firstname,
  lastname: user.lastname,
  name: [user.firstname, user.lastname].filter(Boolean).join(" "),
  isVerified: user.isVerified,
});

// Signup
export const signup = async (req, res, next) => {
  const { email, password } = req.body;
  const profile = buildSignupProfile(req.body);

  try {
    if (!validateSignupInput(email, password, profile, next)) {
      return;
    }

    const userAlreadyExist = await User.findOne({ email });
    if (userAlreadyExist) {
      return next(new ApiError(409, "User already exists", "USER_EXISTS"));
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
      firstname: profile.firstname,
      lastname: profile.lastname,
      phone: profile.phone,
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
      user: formatUserIdentity(newUser),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Internal server error", "SIGNUP_FAILED"),
    );
  }
};

// Email verification
export const verifyEmail = async (req, res, next) => {
  // verify the user email
  const { code } = req.body;

  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new ApiError(
          400,
          "Invalid or expired verification code.",
          "VERIFICATION_CODE_INVALID",
        ),
      );
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, `${user.firstname} ${user.lastname}`);

    // Generate token only after verification
    generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Email verified!",
      user: formatUserIdentity(user),
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Server error", "EMAIL_VERIFICATION_FAILED"),
    );
  }
};

// Login controller
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return next(
        new ApiError(422, "Email and password required", "VALIDATION_ERROR"),
      );
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Generic error to avoid leaking user existence
      return next(new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS"));
    }

    if (!user.isVerified) {
      return next(new ApiError(403, "Verify your email first", "EMAIL_NOT_VERIFIED"));
    }

    user.lastLogin = new Date();
    await user.save();

    generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Logged in successfully",
      user: formatUserIdentity(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Internal server error", "LOGIN_FAILED"),
    );
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

export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ApiError(422, "Invalid email format.", "VALIDATION_ERROR"));
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
    return next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Server error", "FORGOT_PASSWORD_FAILED"),
    );
  }
};

export const resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    // Validate password strenght
    if (password.length < 8) {
      return next(
        new ApiError(422, "Password must be 8+ characters", "VALIDATION_ERROR"),
      );
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });
    // Check if the token is valide
    if (!user) {
      return next(new ApiError(400, "Invalid or expired token", "RESET_TOKEN_INVALID"));
    }

    //Check if the new password must old
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return next(
        new ApiError(
          422,
          "New password must differ from old.",
          "PASSWORD_REUSED",
        ),
      );
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
    return next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Server error", "RESET_PASSWORD_FAILED"),
    );
  }
};

export const verifyAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return next(new ApiError(404, "User not found", "USER_NOT_FOUND"));
    }

    res.status(200).json({
      success: true,
      code: 200,
      user: formatUserIdentity(user),
    });
  } catch (error) {
    console.error("Auth verification error:", error);
    return next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Server error", "AUTH_VERIFICATION_FAILED"),
    );
  }
};
