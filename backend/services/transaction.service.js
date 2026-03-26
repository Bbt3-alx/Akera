import Transaction from "../models/Transaction.js";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import CompanyExchangeRate from "../models/CompanyExchangeRate.js";
import { convert } from "../utils/convertAmount.js";
import { generateTransactionCode } from "../utils/generateTransactionCode.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { ACCOUNTS } from "../constants/accounts.js";
import { writeJournalEntries } from "./ledger.service.js";
import { generateReceipt } from "./receipt.service.js";

// Service to create a transaction
export async function createTransactionService({
  companyId,
  membershipId,
  userId,
  payload,
}) {
  return runTransaction(async (session) => {
    const {
      inputAmount,
      inputCurrency,
      beneficiaryName,
      description,
      idempotencyKey,
    } = payload;

    if (!inputAmount || isNaN(inputAmount) || inputAmount <= 0) {
      throw new ApiError(400, "Invalid amount", "INVALID_AMOUNT");
    }

    if (!["FCFA", "GNF"].includes(inputCurrency)) {
      throw new ApiError(
        400,
        "Unsupported currency. Allowed: FCFA, GNF",
        "UNSUPPORTED_CURRENCY",
      );
    }

    if (!beneficiaryName || beneficiaryName.trim().length < 3) {
      throw new ApiError(
        400,
        "Beneficiary name is required and must be at least 3 characters",
        "INVALID_BENEFICIARY_NAME",
      );
    }

    if (!idempotencyKey) {
      throw new ApiError(
        400,
        "Idempotency key is required",
        "MISSING_IDEMPOTENCY_KEY",
      );
    }

    const existing = await Transaction.findOne({
      idempotencyKey,
      company: companyId,
    }).session(session);
    if (existing) return existing;

    const company = await Company.findById(companyId).session(session);

    if (!company)
      throw new ApiError(404, "Company not found", "COMPANY_NOT_FOUND");

    const membership = await CompanyMembership.findOne({
      _id: membershipId,
      company: companyId,
      role: "partner",
      status: "active",
    }).session(session);

    if (!membership) {
      throw new ApiError(
        404,
        "Partner account not found",
        "PARTNER_ACCOUNT_NOT_FOUND",
      );
    }

    // Retrieve exchange rate
    const rateDoc = await CompanyExchangeRate.findOne({
      company: companyId,
    }).session(session);

    if (!rateDoc) {
      throw new ApiError(
        400,
        "Exchange rate not configured",
        "EXCHANGE_RATE_NOT_CONFIGURED",
      );
    }

    const rate = rateDoc.rate;

    const partnerAmount = convert({
      amount: inputAmount,
      from: inputCurrency,
      to: membership.currency,
      rate,
    });

    const companyAmount = convert({
      amount: inputAmount,
      from: inputCurrency,
      to: company.baseCurrency,
      rate,
    });

    // Create transaction
    const [transaction] = await Transaction.create(
      [
        {
          transactionCode: generateTransactionCode(company.code),
          company: companyId,
          membership: membershipId,

          inputAmount,
          inputCurrency,

          partnerAmount,
          partnerCurrency: membership.currency,

          companyAmount,
          companyCurrency: company.baseCurrency,

          exchangeRate: rate,

          beneficiaryName: beneficiaryName.trim(),
          description: description?.trim(),

          idempotencyKey,
          createdBy: userId,
        },
      ],
      { session },
    );

    // Ledger append-only
    await writeJournalEntries({
      companyId,
      transactionId: transaction._id,
      userId,
      session,
      entries: [
        {
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          currency: membership.currency,
          debit: transaction.partnerAmount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.CLEARING,
          currency: membership.currency,
          debit: 0,
          credit: transaction.partnerAmount,
        },
      ],
    });

    // Update the cache
    const debitResult = await CompanyMembership.updateOne(
      {
        _id: membershipId,
        balance: { $gte: partnerAmount },
      },
      {
        $inc: { balance: -partnerAmount },
      },
      { session },
    );
    if (debitResult.modifiedCount !== 1) {
      throw new ApiError(400, "Insufficient balance", "INSUFFICIENT_BALANCE");
    }

    return transaction;
  });
}

// Service to pay a transaction
export async function payTransactionService({
  companyId,
  transactionCode,
  managerId,
}) {
  return runTransaction(async (session) => {
    const membership = await CompanyMembership.findOne({
      user: managerId,
      company: companyId,
      status: "active",
      role: "manager",
    }).session(session);

    if (!membership) {
      throw new ApiError(403, "Only managers can pay", "UNAUTHORIZED");
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        transactionCode,
        company: companyId,
        status: "pending",
      },
      { $set: { status: "processing" } },
      { new: true, session },
    );

    if (!transaction) {
      const existing = await Transaction.findOne({
        transactionCode,
        company: companyId,
        status: "processing",
      }).session(session);

      if (!existing) {
        throw new ApiError(409, "Transaction in progress", "TX_IN_PROGRESS");
      }

      const completed = await Transaction.findOne({
        transactionCode,
        company: companyId,
        status: "completed",
      }).session(session);
      if (completed) return completed;

      throw new ApiError(400, "Transaction not payable", "NOT_PAYABLE");
    }

    // Ledger entry append-only
    await writeJournalEntries({
      companyId,
      transactionId: transaction._id,
      userId: managerId,
      session,
      entries: [
        // CLEARING TO FX_POSITION (GNF)
        {
          accountCode: ACCOUNTS.CLEARING,
          currency: transaction.partnerCurrency,
          debit: transaction.partnerAmount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.FX_POSITION,
          currency: transaction.partnerCurrency,
          debit: 0,
          credit: transaction.partnerAmount,
        },

        // FX_POSITION TO COMPANY_CASH (FCFA)
        {
          accountCode: ACCOUNTS.FX_POSITION,
          currency: transaction.companyCurrency,
          debit: transaction.companyAmount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.COMPANY_CASH,
          currency: transaction.companyCurrency,
          debit: 0,
          credit: transaction.companyAmount,
        },
      ],
    });

    const debitCompany = await Company.updateOne(
      {
        _id: companyId,
        balance: { $gte: transaction.companyAmount },
      },
      { $inc: { balance: -transaction.companyAmount } },
      { session },
    );

    if (debitCompany.modifiedCount !== 1) {
      throw new ApiError(
        400,
        "Insufficient company balance",
        "INSUFFICIENT_COMPANY_BALANCE",
      );
    }

    transaction.status = "completed";
    transaction.processedBy = managerId;
    transaction.processedAt = new Date();

    await transaction.save({ session });

    const receipt = await generateReceipt({
      transaction,
      companyId,
      managerId,
      session,
    });

    return { transaction, receipt };
  });
}
