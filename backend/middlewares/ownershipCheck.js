import { UsdCustomer } from "../models/DollarExchange.js";
import { ApiError } from "./errorHandler";

export const customerOwnership = async (req, res, next) => {
  try {
    const customer = await UsdCustomer.findById(req.company._id);
    if (!customer?.companies.includes(req.user.company)) {
      return next(new ApiError(403, "Access denied"));
    }

    req.customer = customer;
    next();
  } catch (error) {
    next(new ApiError(500, "Ownership check failed"));
  }
};
