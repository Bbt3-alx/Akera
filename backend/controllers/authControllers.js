import bcrypt from "bcryptjs";
import crypto from "crypto";
import { configDotenv } from "dotenv";

import User from "../models/userModel.js";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendResetSuccessEmail,
} from "../mail/mails.js";

configDotenv();
export const signup = async (req, res) => {
  const { email, password, username, role } = req.body;
  try {
    if (!email || !password || !username) {
      throw new Error("All fields are required");
    }

    const userAlreadyExist = await User.findOne({ email });
    if (userAlreadyExist) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
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
      username,
      role,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    await newUser.save();

    // jwt
    generateTokenAndSetCookie(res, newUser._id);

    await sendVerificationEmail(newUser.email, verificationToken);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        ...newUser,
        password: undefined,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  // verify the user email
  const { code } = req.body;

  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });
    console.log(user);

    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "Invalide verification code" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;

    await user.save();

    await sendWelcomeEmail(user.email, user.username);

    res.status(200).json({
      success: true,
      message: "Email verified successfully!",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.log(`Error in verifying email: ${error}`);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email | !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required field" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not find" });
    }

    const isValidPwd = await bcrypt.compare(password, user.password);
    if (!isValidPwd) {
      return res
        .status(400)
        .json({ success: false, message: "Password incorrect" });
    }

    generateTokenAndSetCookie(res, user._id);
    user.lastLogin = new Date();

    user.save();
    res.status(200).json({
      success: true,
      message: "Connected successfylly",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.log("Error");
  }
};

export const logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Loged out successfylly" });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "There is no user with this email" });
    }

    const pwdResetToken = crypto.randomBytes(30).toString("hex");
    const resetPwdExp = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = pwdResetToken;
    user.resetPasswordExpiresAt = resetPwdExp;

    user.save();

    // Send the reset email
    await sendResetPasswordEmail(
      user.email,
      `${process.env.CLIENT_URL}/forgot-password/${pwdResetToken}`
    );

    res
      .status(200)
      .json({ status: true, message: "Reset link sent to your email" });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Error sending reset email: ${error}`,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });
    console.log("User infos:", user);
    // Check if the token is valide
    if (!user) {
      return res.status(400).json({ status: false, message: "Invalide token" });
    }

    // Update the password and invalidate the token
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    await sendResetSuccessEmail(user.email);

    res
      .status(200)
      .json({ satus: true, message: "Password reset successfully" });
  } catch (error) {
    console.log("Error reseting password");
    res.status(400).json({ status: false, message: error.message });
  }
};

export const verifyAuth = async (req, res) => {
  try {
    // utilizes req.userId to find the corresponding user in the database.
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    // If the user exists, return their information
    // (excluding sensitive data like the password)
    res.status(200).json({
      status: true,
      user: {
        ...user,
        password: undefined,
      },
    });
  } catch (error) {
    console.log("Error checking auhtentication:", error);
    res.status(400).json({ status: false, message: error.message });
  }
};
