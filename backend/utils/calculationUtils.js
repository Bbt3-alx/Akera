import Decimal from "decimal.js";
import { ApiError } from "../middlewares/errorHandler.js";

export const preciseFinancialCalc = (weight, rate) => {
  if (typeof weight !== "number" || Number.isNaN(weight)) {
    throw new ApiError(400, "Weight must be a valid number");
  }

  if (typeof rate !== "number" || Number.isNaN(rate)) {
    throw new ApiError(400, "Rate must be a valid number");
  }

  return new Decimal(weight)
    .times(new Decimal(rate))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
};
