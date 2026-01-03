import Joi from "joi";
import { ApiError } from "../middlewares/errorHandler.js";
import mongoose from "mongoose";

export const validatePhone = (phone) => /^\+?[1-9]\d{1,14}$/.test(phone);
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validateIdParam = (req) => {
  const ids = [];

  // Check params
  if (req.params.operationId) ids.push(req.params.operationId);
  if (req.params.id) ids.push(req.params.id);

  // Check body
  if (req.body.partnerId) ids.push(req.body.partnerId);
  if (req.body.operationId) ids.push(req.body.operationId);

  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, `Invalid ID format: ${id}`, "INVALID_ID");
    }
  }
};

export const validTransitions = {
  "in progress": ["shipped", "on hold"],
  shipped: ["delivered", "on hold"],
  "on hold": ["in progress", "shipped"],
  canceled: [],
};

export function validateStatusTransition(oldStatus, newStatus) {
  return validTransitions[oldStatus]?.includes(newStatus);
}

export const roundTo = (value, decimals) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ApiError(400, `invalid value for rounding: ${value}`);
  }

  if (typeof decimals !== "number" || Number.isNaN(decimals)) {
    throw new ApiError(400, `invalid decimals places: ${decimals}`);
  }

  const factor = Math.pow(10, decimals);
  return (Math.round(value + Number.EPSILON) * factor) / factor;
};
