import { UsdCustomer } from "../models/DollarExchange.js";
import { ApiError } from "./errorHandler";

/**
 * Middleware to verify customer ownership.
 *
 * This middleware checks if the customer specified by the request parameters
 * belongs to the company associated with the request. If the customer is found,
 * it attaches the customer to the request object and calls the next middleware.
 * If the customer is not found or an error occurs, it passes an ApiError to the
 * next middleware.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.id - The ID of the customer to verify.
 * @param {Object} req.company - The company associated with the request.
 * @param {string} req.company._id - The ID of the company.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 *
 * @throws {ApiError} If the customer is not found or an error occurs during verification.
 */
export const verifyCustomerOwnership = async (req, res, next) => {
  try {
    const customer = await UsdCustomer.findOne({
      _id: req.params.id,
      companies: req.company._id,
    });
    if (!customer) {
      throw new ApiError(404, "Customer not found", {
        resourceId: req.params.id,
        companyId: req.company._id.toString(),
      });
    }

    req.customer = customer;
    next();
  } catch (error) {
    next(
      new ApiError(error.statusCode || 500, "Ownership verification failed", {
        ressourceId: error.resourceId || req.params.id,
        companyId: error.companyId || req.company._id,
      })
    );
  }
};
