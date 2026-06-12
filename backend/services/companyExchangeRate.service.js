import CompanyExchangeRate from "../models/CompanyExchangeRate.js";
import { ApiError } from "../middlewares/errorHandler.js";

export const CANONICAL_EXCHANGE_RATE_FROM = "FCFA";
export const CANONICAL_EXCHANGE_RATE_TO = "GNF";

export async function getCurrentCompanyExchangeRate({ companyId }) {
  return CompanyExchangeRate.findOne({ company: companyId }).lean();
}

export async function upsertCompanyExchangeRate({
  companyId,
  userId,
  role,
  payload = {},
}) {
  assertManagerRole(role);
  const rate = normalizeRate(payload.rate);

  return CompanyExchangeRate.findOneAndUpdate(
    { company: companyId },
    {
      $set: {
        rate,
        from: CANONICAL_EXCHANGE_RATE_FROM,
        to: CANONICAL_EXCHANGE_RATE_TO,
        setBy: userId,
      },
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).lean();
}

function assertManagerRole(role) {
  if (role !== "manager") {
    throw new ApiError(
      403,
      "Only managers can update exchange rates",
      "EXCHANGE_RATE_MANAGER_REQUIRED",
    );
  }
}

function normalizeRate(rate) {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new ApiError(
      400,
      "Exchange rate must be a finite number greater than 0",
      "INVALID_EXCHANGE_RATE",
    );
  }

  return rate;
}
