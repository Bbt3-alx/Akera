import { ApiError } from "../middlewares/errorHandler.js";

// Helper function to determine payment status
export const calculatePaymentStatus = (totalAmount, paidAmount) => {
  if (paidAmount >= totalAmount) return "paid";
  if (paidAmount > 0) return "partially paid";
  return "pending";
};

// Helper to validate payment data
export const validatePaymentData = (
  amount,
  remainingAmount,
  companyBalance
) => {
  if (amount <= 0) {
    throw new ApiError(
      400,
      "Payment aount must be greater than zero",
      "INVALID_AMOUNT"
    );
  }

  if (amount > remainingAmountAmount) {
    throw new ApiError(
      422,
      "Amount must not exceed the remaining amount",
      "INVALID_AMOUNT"
    );
  }

  if (companyBalance < remainingAmount) {
    throw new ApiError(
      400,
      "Insufficient balance for this operation",
      "INSUFFICIENT_FUNDS"
    );
  }
};
