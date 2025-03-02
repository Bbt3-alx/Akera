import { ApiError } from "../middlewares/errorHandler.js";

const GRAMS_PER_TROY_OUNCE = 31.1035;

// Convert Weight to grams based on the unit
export const convertWeightToTroyOunces = (weight, unit) => {
  if (typeof weight !== "number" || Number.isNaN(weight)) {
    throw new ApiError(400, `Invalid weight value: ${weight}`);
  }

  switch (unit.toLowerCase()) {
    case "g":
      return weight / GRAMS_PER_TROY_OUNCE;
    case "kg":
      return (weight * 1000) / GRAMS_PER_TROY_OUNCE;
    case "ozt":
      return weight;
    default:
      throw new ApiError(
        400,
        `Invalid unit: ${unit}. Valid units: g, kg, ozt.`
      );
  }
};

export const convertWeightToGrams = (weight, unit) => {
  if (typeof weight !== "number") {
    throw new ApiError(400, `Invalid weigth value: ${weight}`);
  }

  switch (unit.toLowerCase()) {
    case "g":
      return weight;
    case "kg":
      return weight * 1000;
    case "ozt":
      return weight * GRAMS_PER_TROY_OUNCE;
    default:
      throw new ApiError(400, `Invalid unit: ${unit}. Valid units: g, kg, ozt`);
  }
};

export const validateWeightInput = (weight, unit) => {
  const validUnits = new Set(["g", "kg", "ozt"]);

  if ((weight && typeof weight !== "number") || weight <= 0) {
    throw new ApiError(400, `Invalid weight: must be a positive number`);
  }

  if (!validUnits.has(unit.toLowerCase())) {
    throw new ApiError(400, `Invalid unit: ${unit}. Use g, kg or ozt`);
  }

  return true;
};
