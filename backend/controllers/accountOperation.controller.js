import {
  confirmWithdrawalRequest,
  createWithdrawalRequest,
  listAccountOperations,
  rejectWithdrawalRequest,
} from "../services/accountOperation.service.js";
import {
  serializeAccountOperation,
  serializeAccountOperations,
} from "../serializers/accountOperation.serializer.js";

export const createWithdrawalRequestController = async (req, res) => {
  const operation = await createWithdrawalRequest({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });
  const data = serializeAccountOperation(operation);

  res.locals.audit = {
    targetId: operation._id,
    targetCode: operation.operationCode,
    metadata: {
      type: operation.type,
      status: operation.status,
      amount: operation.amount,
      currency: operation.currency,
      targetMembership: operation.targetMembership,
      previousBalance: operation.previousBalance,
      currentBalance: operation.currentBalance,
    },
  };

  res.status(201).json({
    success: true,
    data,
  });
};

export const confirmWithdrawal = async (req, res) => {
  const operation = await confirmWithdrawalRequest({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    operationCode: req.params.operationCode,
  });
  const data = serializeAccountOperation(operation);

  res.locals.audit = {
    targetId: operation._id,
    targetCode: operation.operationCode,
    metadata: {
      type: operation.type,
      status: operation.status,
      amount: operation.amount,
      currency: operation.currency,
      previousBalance: operation.previousBalance,
      currentBalance: operation.currentBalance,
    },
  };

  res.status(200).json({
    success: true,
    data,
  });
};

export const rejectWithdrawal = async (req, res) => {
  const operation = await rejectWithdrawalRequest({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    operationCode: req.params.operationCode,
  });
  const data = serializeAccountOperation(operation);

  res.locals.audit = {
    targetId: operation._id,
    targetCode: operation.operationCode,
    metadata: {
      type: operation.type,
      status: operation.status,
      amount: operation.amount,
      currency: operation.currency,
    },
  };

  res.status(200).json({
    success: true,
    data,
  });
};

export const getAccountOperations = async (req, res) => {
  const result = await listAccountOperations({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    code: 200,
    pagination: result.pagination,
    data: serializeAccountOperations(result.operations),
  });
};
