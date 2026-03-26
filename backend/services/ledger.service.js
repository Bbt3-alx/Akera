import LedgerEntry from "../models/LedgerEntry.js";

export async function getAccountBalance({
  companyId,
  membershipId,
  accountType,
  currency,
  session,
}) {
  const match = {
    company: companyId,
    accountType,
    currency,
  };

  if (membershipId) {
    match.membership = membershipId;
  }

  const result = await LedgerEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]).session(session);

  return result[0]?.total || 0;
}

export async function writeJournalEntries({
  companyId,
  transactionId,
  entries,
  userId,
  session,
}) {
  validateJournalBalance(entries);

  const formatted = entries.map((entry) => ({
    company: companyId,
    transaction: transactionId,
    accountCode: entry.accountCode,
    currency: entry.currency,
    debit: entry.debit || 0,
    credit: entry.credit || 0,
    createdBy: userId,
  }));

  return LedgerEntry.insertMany(formatted, { session });
}

export function validateJournalBalance(entries) {
  const balances = new Map();

  for (const e of entries) {
    if (!balances.has(e.currency)) {
      balances.set(e.currency, 0);
    }

    balances.set(e.currency, balances.get(e.currency) + e.debit - e.credit);
  }

  for (const [currency, balance] of balances.entries()) {
    if (Math.abs(balance) > 0.001) {
      throw new Error(`Journal not balanced for currency: ${currency}`);
    }
  }
}
