import {
  createTransactionService,
  payTransactionService,
  cancelPendingTransactionService,
} from "../services/transaction.service.js";
import Receipt from "../models/Receipt.js";
import { runTransaction } from "../utils/dbTransaction.js";
import CompanyMembership from "../models/CompanyMembership.js";
import { ApiError } from "../middlewares/errorHandler.js";
import Transaction from "../models/Transaction.js";
import { writeJournalEntries } from "../services/ledger.service.js";
import { ACCOUNTS } from "../constants/accounts.js";

// Controller to handle transaction creation
export const createTransaction = async (req, res) => {
  const result = await createTransactionService({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    payload: req.body,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
};

// Controller to handle transaction payment
export const payTransaction = async (req, res) => {
  const result = await payTransactionService({
    companyId: req.context.companyId,
    transactionCode: req.params.transactionCode,
    managerId: req.user.id,
  });

  res.json({
    success: true,
    data: result,
  });
};

// Controller to handle transaction cancellation
export const cancelPendingTransaction = async (req, res) => {
  const {companyId} = req.context;
  const {transactionCode} = req.params;
  const {reason} = req.body;

  const transaction = await cancelPendingTransactionService({
    companyId,
    transactionCode,
    managerId: req.user.id,
    reason,
  });

  res.status(200).json({
    success: true,
    data: transaction,
  })
}