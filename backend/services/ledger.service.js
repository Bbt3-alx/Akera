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

export async function writeLedgerEntry({
  companyId,
  membershipId,
  transactionId,
  accountType,
  currency,
  amount,
  type,
  userId,
  session,
}) {
  return LedgerEntry.create(
    [
      {
        company: companyId,
        membership: membershipId,
        transaction: transactionId,
        accountType,
        currency,
        amount,
        type,
        createdBy: userId,
      },
    ],
    { session },
  );
}
