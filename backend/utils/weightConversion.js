// Convert Weight to grams based on the unit
export const convertWeightToTroyOunces = (weight, unit) => {
  switch (unit) {
    case "g":
      return weight / 31.1035;
    case "kg":
      return (weight * 1000) / 31.1035;
    case "oz":
      return weight;
    default:
      throw new Error(`Invalid unit provided: ${unit}. Weight: ${weight}.`);
  }
};

export const convertWeightToGrams = (weight, unit) => {
  switch (unit) {
    case "g":
      return weight;
    case "kg":
      return weight * 1000;
    case "oz":
      return weight * 31.1035;
    default:
      throw new Error(`Invalid unit provided: ${unit}. Weight: ${weight}.`);
  }
};
