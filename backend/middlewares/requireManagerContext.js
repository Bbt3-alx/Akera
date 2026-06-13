import { ApiError } from "./errorHandler.js";

export const requireManagerContext = (req, res, next) => {
  if (req.context?.role !== "manager") {
    return next(
      new ApiError(
        403,
        "Only managers can manage transaction PINs",
        "TRANSACTION_PIN_MANAGER_REQUIRED",
      ),
    );
  }

  next();
};
