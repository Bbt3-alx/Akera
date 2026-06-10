import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/User.js";
import { ApiError } from "../middlewares/errorHandler.js";
import {
  serializeMembership,
  serializeUser,
} from "../serializers/auth.serializer.js";
import {
  sendResetPasswordEmail,
  sendResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../mail/mails.js";
import { generateAccessToken } from "../utils/generateToken.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { fetchActiveMemberships } from "./membership.service.js";

const buildSignupProfile = ({
  firstName,
  lastName,
  name,
  phone,
}) => {
  const trimmedFirstName = (firstName)?.trim();
  const trimmedLastName = (lastName)?.trim();
  const trimmedName = name?.trim();

  if (trimmedFirstName && trimmedLastName) {
    return {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      phone,
    };
  }

  const [firstNamePart, ...lastNameParts] = trimmedName?.split(/\s+/) || [];

  return {
    firstName: firstNamePart,
    lastName: lastNameParts.join(" ") || firstNamePart,
    phone,
  };
};

const normalizeEmail = (email) => email?.trim().toLowerCase();

const validateSignupPayload = (email, password, profile) => {
  if (
    !email ||
    !password ||
    !profile.firstName ||
    !profile.lastName ||
    !profile.phone
  ) {
    throw new ApiError(422, "Missing required fields.", "VALIDATION_ERROR");
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError(422, "Invalid email format", "VALIDATION_ERROR");
  }
};

export async function signupUser(payload = {}) {
  const email = normalizeEmail(payload.email);
  const profile = buildSignupProfile(payload);

  validateSignupPayload(email, payload.password, profile);

  const userAlreadyExist = await User.findOne({ email }).lean();
  if (userAlreadyExist) {
    throw new ApiError(409, "User already exists", "USER_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const verificationToken = Math.floor(
    100000 + Math.random() * 900000,
  ).toString();

  const user = await User.create({
    email,
    password: hashedPassword,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    verificationToken,
    verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  if (process.env.NODE_ENV === "production") {
    await sendVerificationEmail(user.email, verificationToken);
  }

  return {
    user: serializeUser(user),
    memberships: [],
  };
}

export async function loginUser(payload = {}) {
  const email = normalizeEmail(payload.email);
  const { password } = payload;

  if (!email || !password) {
    throw new ApiError(422, "Email and password required", "VALIDATION_ERROR");
  }

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Verify your email first", "EMAIL_NOT_VERIFIED");
  }

  const lastLogin = new Date();
  await User.updateOne({ _id: user._id }, { $set: { lastLogin } });
  user.lastLogin = lastLogin;

  const memberships = await fetchActiveMemberships(user._id);
  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    user: serializeUser(user),
    memberships: memberships.map(serializeMembership),
  };
}

export async function getAuthenticatedUser(userId) {
  const user = await User.findById(userId)
    .select("_id email firstName lastName isVerified")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  const memberships = await fetchActiveMemberships(userId);

  return {
    user: serializeUser(user),
    memberships: memberships.map(serializeMembership),
  };
}

export async function verifyEmail(payload = {}) {
  const { code } = payload;

  if (!code) {
    throw new ApiError(422, "Verification code is required", "VALIDATION_ERROR");
  }

  const user = await runTransaction(async (session) => {
    const foundUser = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    }).session(session);

    if (!foundUser) {
      throw new ApiError(
        400,
        "Invalid or expired verification code.",
        "VERIFICATION_CODE_INVALID",
      );
    }

    foundUser.isVerified = true;
    foundUser.verificationToken = undefined;
    foundUser.verificationTokenExpiresAt = undefined;
    await foundUser.save({ session });

    return foundUser;
  });

  await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);

  return {
    token: generateAccessToken(user),
    user: serializeUser(user),
  };
}

export async function forgotPassword(payload = {}) {
  const email = normalizeEmail(payload.email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ApiError(422, "Invalid email format.", "VALIDATION_ERROR");
  }

  const user = await User.findOne({ email });
  if (!user) {
    return {
      message: "If the email exists, a reset link will be sent",
    };
  }

  return runTransaction(async (session) => {
    const resetPasswordToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordExpiresAt = Date.now() + 3600000;

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpiresAt = resetPasswordExpiresAt;
    await user.save({ session });

    await sendResetPasswordEmail(
      user.email,
      `${process.env.CLIENT_URL}/reset-password/${resetPasswordToken}`,
    );

    return {
      message: "Reset link sent if email exists",
    };
  });
}

export async function resetPassword(token, payload = {}) {
  const { password } = payload;

  if (!token) {
    throw new ApiError(400, "Reset token is required", "RESET_TOKEN_MISSING");
  }

  if (!password || password.length < 8) {
    throw new ApiError(
      422,
      "Password must be 8+ characters",
      "VALIDATION_ERROR",
    );
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiresAt: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired token", "RESET_TOKEN_INVALID");
  }

  const isSamePassword = await bcrypt.compare(password, user.password);
  if (isSamePassword) {
    throw new ApiError(
      422,
      "New password must differ from old.",
      "PASSWORD_REUSED",
    );
  }

  return runTransaction(async (session) => {
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.tokenVersion += 1;
    await user.save({ session });

    await sendResetSuccessEmail(user.email);

    return {
      message: "Password reset successfully",
    };
  });
}
