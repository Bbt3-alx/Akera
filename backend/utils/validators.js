import Joi from "joi";
import { ApiError } from "../middlewares/errorHandler.js";

export const validatePhone = (phone) => /^\+?[1-9]\d{1,14}$/.test(phone);
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validateIdParam = (req) => {
  const { error } = Joi.string().hex().length(24).validate(req.params.id);
  if (error) throw new ApiError(400, "Invalid ID format");
  return true;
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
