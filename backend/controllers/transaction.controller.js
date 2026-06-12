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
  const transaction = await createTransactionService({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    payload: req.body,
  });

  const data = await serializeCreateResult({
    transaction,
    companyId: req.context.companyId,
  });

  res.locals.audit = {
    targetId: transaction._id,
    targetCode: transaction.transactionCode,
    metadata: {
      status: transaction.status,
      inputAmount: transaction.inputAmount,
      inputCurrency: transaction.inputCurrency,
      beneficiaryName: transaction.beneficiaryName,
    },
  };

  res.status(201).json({
    success: true,
    data,
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
  const transaction = result?.transaction ?? result;
  const receipt = result?.receipt;

  res.locals.audit = {
    targetId: transaction._id,
    targetCode: transaction.transactionCode,
    metadata: {
      status: transaction.status,
      companyAmount: transaction.companyAmount,
      companyCurrency: transaction.companyCurrency,
      receiptId: receipt?._id,
      receiptNumber: receipt?.receiptNumber,
    },
  };

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

  res.locals.audit = {
    targetId: transaction._id,
    targetCode: transaction.transactionCode,
    metadata: {
      status: transaction.status,
      reason,
    },
  };

  res.status(200).json({
    success: true,
    data,
  });
};

export const reverseCompletedTransaction = async (req, res) => {

  const { companyId} = req.context;
  const { transactionCode} = req.params;
  const {reason} = req.body;
  const sanitizedReason = sanitizeAuditReason(reason);

  const transaction = await reverseCompletedTransactionService({
    companyId,
    transactionCode,
    managerId: req.user.id,
    reason,
  });

  res.locals.audit = {
    targetId: transaction._id,
    targetCode: transaction.transactionCode,
    metadata: {
      status: transaction.status,
      reason: sanitizedReason,
    },
  };

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

async function serializeCreateResult({ transaction, companyId }) {
  const serializableTransaction = await findSerializableTransaction(
    transaction,
    companyId,
  );

  return serializeTransactionMutationResult(serializableTransaction);
}

async function serializeCancelResult({ transaction, companyId }) {
  const serializableTransaction = await findSerializableTransaction(
    transaction,
    companyId,
  );

  return serializeTransactionMutationResult(serializableTransaction);
}

export function serializeTransactionMutationResult(transaction) {
  return {
    transaction: serializeTransaction(transaction),
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

function sanitizeAuditReason(reason) {
  if (typeof reason !== "string") {
    return undefined;
  }

  const trimmedReason = reason.trim();

  return trimmedReason || undefined;
}
