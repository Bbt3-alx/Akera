import { ApiError } from "../middlewares/errorHandler.js";

/**
 * Convert an amount between supported currencies.
 *
 * Rate semantics for FCFA <-> GNF conversions:
 * - `rate` is the value of `FCFA_BASE` (5000) FCFA expressed in the target currency.
 *   Example: if `FCFA_BASE = 5000` and `rate = 85000`, then 5000 FCFA == 85_000 GNF.
 *
 * @param {Object} params
 * @param {number} params.amount - Amount in the source currency (>= 0).
 * @param {string} params.from - Source currency code (e.g. "FCFA").
 * @param {string} params.to - Target currency code (e.g. "GNF").
 * @param {number} params.rate - Exchange rate according to the semantics above (> 0).
 * @returns {number} Converted amount (rounded to nearest integer).
 * @throws {ApiError} On invalid input or unsupported conversion.
 */
export function convert({ amount, from, to, rate }) {
  const f = String(from || "").toUpperCase();
  const t = String(to || "").toUpperCase();

  if (!f || !t) {
    throw new ApiError(400, "Invalid currency", "INVALID_CURRENCY");
  }

  if (f === t) return amount;

  if (!Number.isFinite(amount) || amount < 0) {
    throw new ApiError(400, "Invalid amount", "INVALID_AMOUNT");
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new ApiError(400, "Invalid exchange rate", "INVALID_RATE");
  }

  const FCFA_BASE = 5000;

  const key = `${f}->${t}`;

  switch (key) {
    case "FCFA->GNF":
      return Math.round((amount / FCFA_BASE) * rate);
    case "GNF->FCFA":
      return Math.round((amount * FCFA_BASE) / rate);
    default:
      throw new ApiError(
        400,
        `Unsupported currency conversion: ${f} → ${t}`,
        "UNSUPPORTED_CURRENCY",
      );
  }
}
