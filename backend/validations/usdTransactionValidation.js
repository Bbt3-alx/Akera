import Joi from "joi";
import { ApiError } from "../middlewares/errorHandler.js";

export const validateUsdTransactionInput = (data) => {
  const schema = Joi.object({
    rate: Joi.number().min(1).required(),
    amountUSD: Joi.number().min(1).required(),
    usdTaker: Joi.string().required(),
    usdCustomerId: Joi.string().required(),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, "Validation error", {
      field: error.details[0].path[0],
      message: error.details[0].message,
    });
  }
  return value;
};
