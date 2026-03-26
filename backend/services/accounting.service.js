import LedgerEntry from "../models/LedgerEntry.js";
import { ApiError } from "../middlewares/errorHandler.js";

export async function getTrialBalance(companyId) {
  const results = await LedgerEntry.aggregate([
    {
      $match: {
        company: companyId,
      },
    },

    {
      $group: {
        _id: {
          currency: "$currency",
          accountCode: "$accountCode",
        },
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
      },
    },
  ]);

  const trialBalance = {};

  for (const row of results) {
    const { currency, accountCode } = row._id;
    const balance = row.totalDebit - row.totalCredit;

    if (!trialBalance[currency]) {
      trialBalance[currency] = {};
    }

    trialBalance[currency][accountCode] = balance;
  }

  for (const currency in trialBalance) {
    const total = Object.values(trialBalance[currency]).reduce(
      (sum, val) => sum + val,
      0,
    );

    if (Math.abs(total) > 0.001) {
      throw new ApiError(
        500,
        `Trial balance not balanced for currency ${currency}`,
        "TRIAL_BALANCE_ERROR",
      );
    }
  }

  return trialBalance;
}
