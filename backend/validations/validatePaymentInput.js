import { ApiError } from "../middlewares/errorHandler.js";
import mongoose from "mongoose";

export const validatePaymentInput = (data) => {
  const { amount, method, partnerId } = data;
  const errors = {};

  if (!amount) errors.amount = "Payment amount is required";
  else if (isNaN(amount) || amount <= 0)
    errors.amount = "Amount must be a positive number";

  if (!method) errors.method = "Payment method is required";

  if (!partnerId) errors.partnerId = "Partner ID is required";
  else if (!mongoose.Types.ObjectId.isValid(partnerId))
    errors.partnerId = "Invalid partner ID format";

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Invalid payment data", "VALIDATION_ERROR", {
      errors,
    });
  }
};
