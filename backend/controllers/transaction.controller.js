import {
  createTransactionService,
  payTransactionService,
} from "../services/transaction.service.js";

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
