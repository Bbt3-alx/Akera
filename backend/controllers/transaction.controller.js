import {
  createTransactionService,
  payTransactionService,
  cancelPendingTransactionService,
  reverseCompletedTransactionService,
} from "../services/transaction.service.js";
import Receipt from "../models/Receipt.js";
import Transaction from "../models/Transaction.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { serializeTransaction } from "../serializers/transaction.serializer.js";
import { serializeReceipt } from "../serializers/receipt.serializer.js";

const transactionPartnerPopulate = {
  path: "membership",
  select: "user",
  populate: {
    path: "user",
    select: "firstName lastName name email",
  },
};

const transactionCreatedByPopulate = {
  path: "createdBy",
  select: "firstName lastName name email",
};

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

  const data = await serializePaymentResult({
    result,
    companyId: req.context.companyId,
  });

  res.json({
    success: true,
    data,
  });
};

// Controller to handle transaction cancellation
export const cancelPendingTransaction = async (req, res) => {
  const { companyId } = req.context;
  const { transactionCode } = req.params;
  const reason = normalizeCancelReason(req.body?.reason);

  const transaction = await cancelPendingTransactionService({
    companyId,
    transactionCode,
    managerId: req.user.id,
    reason,
  });

  const data = await serializeCancelResult({
    transaction,
    companyId,
  });

  res.status(200).json({
    success: true,
    data,
  });
};

export const reverseCompletedTransaction = async (req, res) => {

  const { companyId} = req.context;
  const { transactionCode} = req.params;
  const {reason} = req.body;

  const transaction = await reverseCompletedTransactionService({
    companyId,
    transactionCode,
    managerId: req.user.id,
    reason,
  });

  return res.status(200).json({
    success: true,
    data: transaction,
  });
};

async function serializePaymentResult({ result, companyId }) {
  const transaction = result?.transaction ?? result;
  const receipt =
    result?.receipt ?? (await findReceiptForTransaction(transaction, companyId));
  const serializableTransaction = await findSerializableTransaction(
    transaction,
    companyId,
  );

  return {
    transaction: serializeTransaction(serializableTransaction),
    receipt: serializeReceipt(receipt),
  };
}

async function serializeCancelResult({ transaction, companyId }) {
  const serializableTransaction = await findSerializableTransaction(
    transaction,
    companyId,
  );

  return {
    transaction: serializeTransaction(serializableTransaction),
  };
}

async function findSerializableTransaction(transaction, companyId) {
  const transactionId = transaction?._id ?? transaction?.id;

  if (!transactionId) {
    return transaction;
  }

  const populatedTransaction = await Transaction.findOne({
    _id: transactionId,
    company: companyId,
  })
    .populate(transactionPartnerPopulate)
    .populate(transactionCreatedByPopulate)
    .lean();

  return populatedTransaction ?? transaction.toObject?.() ?? transaction;
}

async function findReceiptForTransaction(transaction, companyId) {
  const transactionId = transaction?._id ?? transaction?.id;

  if (!transactionId) {
    return null;
  }

  return Receipt.findOne({
    transaction: transactionId,
    company: companyId,
  }).lean();
}

export function normalizeCancelReason(reason) {
  if (reason === undefined) {
    return undefined;
  }

  if (typeof reason !== "string") {
    throw new ApiError(
      400,
      "Cancel reason must be a string",
      "INVALID_CANCEL_REASON",
    );
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return undefined;
  }

  if (trimmedReason.length > 300) {
    throw new ApiError(
      400,
      "Cancel reason must be 300 characters or fewer",
      "INVALID_CANCEL_REASON",
    );
  }

  return trimmedReason;
}
