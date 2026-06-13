import { ACCOUNTS } from "../constants/accounts.js";
import Company from "../models/Company.js";
import CompanyCashMovement from "../models/CompanyCashMovement.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { writeJournalEntries } from "./ledger.service.js";

const VALID_CURRENCIES = new Set(["FCFA", "GNF"]);
const VALID_DEPOSIT_METHODS = new Set(["cash", "bank", "mobile_money", "other"]);

export async function getCompanyCash({ companyId }) {
  const company = await Company.findById(companyId)
    .select("balance baseCurrency")
    .lean();

  if (!company) {
    throw new ApiError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  return {
    balance: company.balance ?? 0,
    currency: company.baseCurrency,
  };
}

export async function createCompanyCashDeposit({
  companyId,
  userId,
  payload = {},
}) {
  const normalized = normalizeDepositPayload(payload);

  try {
    return await runTransaction(async (session) => {
      const existingDeposit = await CompanyCashMovement.findOne({
        company: companyId,
        idempotencyKey: normalized.idempotencyKey,
      })
        .session(session)
        .lean();

      if (existingDeposit) {
        return existingDeposit;
      }

      const company = await Company.findById(companyId)
        .select("balance baseCurrency")
        .session(session)
        .lean();

      if (!company) {
        throw new ApiError(404, "Company not found", "COMPANY_NOT_FOUND");
      }

      if (normalized.currency !== company.baseCurrency) {
        throw new ApiError(
          400,
          "Deposit currency must match company base currency",
          "DEPOSIT_CURRENCY_MISMATCH",
        );
      }

      const previousBalance = company.balance ?? 0;
      const currentBalance = previousBalance + normalized.amount;
      const [deposit] = await CompanyCashMovement.create(
        [
          {
            company: companyId,
            type: "deposit",
            amount: normalized.amount,
            currency: normalized.currency,
            method: normalized.method,
            reference: normalized.reference,
            note: normalized.note,
            idempotencyKey: normalized.idempotencyKey,
            createdBy: userId,
            previousBalance,
            currentBalance,
          },
        ],
        { session },
      );

      const ledgerEntries = await writeJournalEntries({
        companyId,
        userId,
        session,
        entries: [
          {
            accountCode: ACCOUNTS.COMPANY_CASH,
            currency: normalized.currency,
            debit: normalized.amount,
            credit: 0,
          },
          {
            accountCode: ACCOUNTS.CASH_FUNDING_SOURCE,
            currency: normalized.currency,
            debit: 0,
            credit: normalized.amount,
          },
        ],
      });

      deposit.ledgerEntries = ledgerEntries.map((entry) => entry._id);
      await deposit.save({ session });

      const balanceUpdate = await Company.updateOne(
        { _id: companyId },
        { $inc: { balance: normalized.amount } },
        { session },
      );

      if (balanceUpdate.modifiedCount !== 1) {
        throw new ApiError(
          500,
          "Failed to update company balance",
          "COMPANY_BALANCE_UPDATE_FAILED",
        );
      }

      return deposit;
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existingDeposit = await CompanyCashMovement.findOne({
        company: companyId,
        idempotencyKey: normalized.idempotencyKey,
      }).lean();

      if (existingDeposit) {
        return existingDeposit;
      }
    }

    throw error;
  }
}

function normalizeDepositPayload(payload) {
  const amount = normalizeAmount(payload.amount);
  const currency = normalizeCurrency(payload.currency);
  const method = normalizeMethod(payload.method);
  const idempotencyKey = normalizeRequiredString(
    payload.idempotencyKey,
    "Idempotency key is required",
    "IDEMPOTENCY_KEY_REQUIRED",
  );

  return {
    amount,
    currency,
    method,
    idempotencyKey,
    reference: normalizeOptionalString({
      errorCode: "INVALID_DEPOSIT_REFERENCE",
      label: "Reference",
      maxLength: 100,
      value: payload.reference,
    }),
    note: normalizeOptionalString({
      errorCode: "INVALID_DEPOSIT_NOTE",
      label: "Note",
      maxLength: 300,
      value: payload.note,
    }),
  };
}

function normalizeAmount(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(
      400,
      "Deposit amount must be a finite number greater than 0",
      "INVALID_DEPOSIT_AMOUNT",
    );
  }

  return amount;
}

function normalizeCurrency(currency) {
  const normalized = normalizeRequiredString(
    currency,
    "Deposit currency is required",
    "INVALID_DEPOSIT_CURRENCY",
  );

  if (!VALID_CURRENCIES.has(normalized)) {
    throw new ApiError(
      400,
      "Deposit currency must be FCFA or GNF",
      "INVALID_DEPOSIT_CURRENCY",
    );
  }

  return normalized;
}

function normalizeMethod(method) {
  const normalized = normalizeRequiredString(
    method,
    "Deposit method is required",
    "INVALID_DEPOSIT_METHOD",
  );

  if (!VALID_DEPOSIT_METHODS.has(normalized)) {
    throw new ApiError(
      400,
      "Deposit method must be cash, bank, mobile_money, or other",
      "INVALID_DEPOSIT_METHOD",
    );
  }

  return normalized;
}

function normalizeRequiredString(value, message, errorCode) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, message, errorCode);
  }

  return value.trim();
}

function normalizeOptionalString({ errorCode, label, maxLength, value }) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, `${label} must be a string`, errorCode);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new ApiError(
      400,
      `${label} must be ${maxLength} characters or fewer`,
      errorCode,
    );
  }

  return trimmed;
}
