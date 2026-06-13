import bcrypt from "bcrypt";

import User from "../models/User.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { comparePin, hashPin } from "../utils/hashPin.js";

const TRANSACTION_PIN_PATTERN = /^\d{6}$/;

export async function getTransactionPinStatus(userId) {
  const user = await User.findById(userId).select("+transactionPinHash");

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return {
    configured: Boolean(user.transactionPinHash),
  };
}

export async function setupTransactionPin({
  currentPassword,
  transactionPin,
  userId,
}) {
  const normalizedPin = normalizePin(transactionPin, "PIN_REQUIRED");
  validateRequiredString(
    currentPassword,
    "Current password is required",
    "CURRENT_PASSWORD_REQUIRED",
  );

  const user = await findUserWithSecurityFields(userId);

  if (user.transactionPinHash) {
    throw new ApiError(
      409,
      "Transaction PIN is already configured",
      "PIN_ALREADY_CONFIGURED",
    );
  }

  await verifyPassword(currentPassword, user.password);

  user.transactionPinHash = await hashPin(normalizedPin);
  await user.save();

  return {
    configured: true,
  };
}

export async function changeTransactionPin({
  currentPassword,
  currentTransactionPin,
  newTransactionPin,
  userId,
}) {
  validateRequiredString(
    currentPassword,
    "Current password is required",
    "CURRENT_PASSWORD_REQUIRED",
  );
  const normalizedCurrentPin = normalizePin(
    currentTransactionPin,
    "CURRENT_TRANSACTION_PIN_REQUIRED",
  );
  const normalizedNewPin = normalizePin(
    newTransactionPin,
    "NEW_TRANSACTION_PIN_REQUIRED",
  );

  const user = await findUserWithSecurityFields(userId);

  if (!user.transactionPinHash) {
    throw new ApiError(
      409,
      "Transaction PIN is not configured",
      "PIN_NOT_CONFIGURED",
    );
  }

  await verifyPassword(currentPassword, user.password);

  const pinValid = await comparePin(
    normalizedCurrentPin,
    user.transactionPinHash,
  );

  if (!pinValid) {
    throw new ApiError(
      401,
      "Invalid current transaction PIN",
      "INVALID_CURRENT_PIN",
    );
  }

  user.transactionPinHash = await hashPin(normalizedNewPin);
  await user.save();

  return {
    configured: true,
  };
}

async function findUserWithSecurityFields(userId) {
  const user = await User.findById(userId).select(
    "+password +transactionPinHash",
  );

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return user;
}

async function verifyPassword(currentPassword, passwordHash) {
  const passwordValid = await bcrypt.compare(currentPassword, passwordHash);

  if (!passwordValid) {
    throw new ApiError(401, "Invalid password", "INVALID_PASSWORD");
  }
}

function normalizePin(value, missingErrorCode) {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(400, "PIN is required", missingErrorCode);
  }

  const normalizedPin = String(value).trim();

  if (!TRANSACTION_PIN_PATTERN.test(normalizedPin)) {
    throw new ApiError(
      400,
      "PIN must contain exactly 6 digits",
      "INVALID_PIN",
    );
  }

  return normalizedPin;
}

function validateRequiredString(value, message, errorCode) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(400, message, errorCode);
  }
}
