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
      }).session(session);

      if (existing?.status === "processing") {
        throw new ApiError(409, "Transaction in progress", "TX_IN_PROGRESS");
      }

      if (existing?.status === "canceling") {
        throw new ApiError(
          409,
          "Transaction is been canceled",
          "TX_CANCELING",
        )
      }

      if (existing?.status === "canceled") {
        throw new ApiError(
          400,
          "Canceled transactions cannot be paid",
          "TX_CANCELED",
        )
      }

      if (existing?.status === "completed") {
        return existing;
      }

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

// Service to cancel a pending transaction
export async function cancelPendingTransactionService({
  companyId,
  transactionCode,
  managerId,
  reason,
}) {
  return runTransaction(async (session) => {
    // Verify manager role
    const membership = await CompanyMembership.findOne({
      user: managerId,
      company: companyId,
      role: "manager",
      status: "active",
    }).session(session);

    if (!membership) {
      throw new ApiError(
        403,
        "Only managers can cancel transactions",
        "UNAUTHORIZED",
      );
    }

    // Lock pending transaction
    const transaction = await Transaction.findOneAndUpdate(
      {
        transactionCode,
        company: companyId,
        status: "pending",
      },
      {
        $set: {
          status: "canceling",
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!transaction) {
      throw new ApiError(
        404,
        "Transaction cannot be canceled",
        "NOT_CANCELABLE",
      );
    }

    // Recredit partner balance
    const creditPartner = await CompanyMembership.updateOne(
      {
        _id: transaction.membership,
      },
      {
        $inc: {
          balance: transaction.partnerAmount,
        },
      },
      { session },
    );

    if (creditPartner.modifiedCount === 0) {
      throw new ApiError(
        500,
        "Failed to restore partner balance",
        "BALANCE_RESTORE_FAILED",
      );
    }

    // Reverse ledger
    await writeJournalEntries({
      companyId,
      transactionId: transaction._id,
      userId: managerId,
      session,
      entries: [
        {
          accountCode: ACCOUNTS.CLEARING,
          currency: transaction.partnerCurrency,
          debit: transaction.partnerAmount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          currency: transaction.partnerCurrency,
          debit: 0,
          credit: transaction.partnerAmount,
        },
      ],
    });

    // Finalize cancellation
    transaction.status = "canceled";
    transaction.canceledBy = managerId;
    transaction.canceledAt = new Date();
    transaction.cancelReason = reason;

    await transaction.save({ session });

    return transaction;
  });
}

// Service to reverse a completed transaction
export async function reverseCompletedTransactionService({
  companyId,
  transactionCode,
  managerId,
  reason,
}) {
  return runTransaction(async (session) => {

    const membership = await CompanyMembership.findOne({
      user: managerId,
      company: companyId,
      role: "manager",
      status: "active",
    }).session(session);

    if(!membership) {
      throw new ApiError(
        403,
        "Only managers can reverse transactions",
        "UNAUTHORIZED",
      )
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        transactionCode,
        company: companyId,
        status: "completed",
      },
      {
        $set: {
          status: "reversing",
        },
      },
      {
        new: true,
        session,
      }
    );

    if(!transaction) {
      const existing = await Transaction.findOne({
        transactionCode,
        company: companyId,
      }).session(session);

      if(existing?.status === "reversing") {
        throw new ApiError(
        409,
        "Transaction reversal in progress",
        "TX_REVERSING",
      );
      }

      if(existing?.status === "reversed") {
        throw new ApiError(
          400,
          "Transaction already reversed",
          "TX_ALREADY_REVERSED",
        )
      }

      throw new ApiError(
        400,
        "Transaction not reversible",
        "NOT_REVERSIBLE",
      );
    }

    // Reverse partner balance
    const restorePartner = await CompanyMembership.updateOne(
      {
        _id: transaction.membership,
      },
      {
        $inc: {
          balance: transaction.partnerAmount,
        },
      },
      {session}
    );

    if (restorePartner.modifiedCount !== 1) {
      throw new ApiError(
        500,
        "Failed to restore partner balance",
        "BALANCE_RESTORE_FAILED",
      );
    }

    // Restore company balance
    const restoreCompany = await Company.updateOne(
      {
        _id: companyId,
      },
      {
        $inc: {
          balance: transaction.companyAmount,
        },
      },
      { session }
    )

    if(restoreCompany.modifiedCount !== 1) {
      throw new ApiError(
        500,
        "Failed to restore company balance",
        "COMPANY_BALANCE_RESTORE_FAILED",
      );
    }

    // Reverse accounting entries
    await writeJournalEntries({
      companyId,
      transactionId: transaction._id,
      userId: managerId,
      session,
      entries: [

        // Reverse payment (GNF)
        {
          accountCode: ACCOUNTS.FX_POSITION,
          currency: transaction.partnerCurrency,
          debit: transaction.partnerAmount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.CLEARING,
          currency: transaction.partnerCurrency,
          debit: 0,
          credit: transaction.partnerAmount,
        },

        // Reverse payment (FCFA)
        {
          accountCode: ACCOUNTS.COMPANY_CASH,
          currency: transaction.companyCurrency,
          debit: transaction.companyAmount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.FX_POSITION,
          currency: transaction.companyCurrency,
          debit: 0,
          credit: transaction.companyAmount,
        },

        // reverse creation
        {
          accountCode: ACCOUNTS.CLEARING,
          currency: transaction.partnerCurrency,
          debit: transaction.partnerAmount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          currency: transaction.partnerCurrency,
          debit: 0,
          credit: transaction.partnerAmount,
        },
      ],
    })

    await finalizeReversedTransaction({
      managerId,
      reason,
      session,
      transaction,
    });

    return transaction;
  })
}

export async function finalizeReversedTransaction({
  managerId,
  now = new Date(),
  reason,
  session,
  transaction,
}) {
  transaction.status = "reversed";
  transaction.reversedAt = now;
  transaction.reversedBy = managerId;
  transaction.reversedReason = reason;

  await transaction.save({ session });

  return transaction;
}
