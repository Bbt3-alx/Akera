import {
  createCompanyCashDeposit,
  getCompanyCash,
} from "../services/companyCash.service.js";
import { serializeCompanyCashDeposit } from "../serializers/companyCash.serializer.js";

export const getCash = async (req, res) => {
  const cash = await getCompanyCash({
    companyId: req.context.companyId,
  });

  res.status(200).json({
    success: true,
    data: cash,
  });
};

export const createDeposit = async (req, res) => {
  const deposit = await createCompanyCashDeposit({
    companyId: req.context.companyId,
    userId: req.user.id,
    payload: req.body,
  });
  const data = serializeCompanyCashDeposit(deposit);

  res.locals.audit = {
    targetId: deposit._id,
    targetCode: deposit.reference,
    metadata: {
      amount: deposit.amount,
      currency: deposit.currency,
      method: deposit.method,
      reference: deposit.reference,
      note: deposit.note,
      previousBalance: deposit.previousBalance,
      currentBalance: deposit.currentBalance,
    },
  };

  res.status(201).json({
    success: true,
    data,
  });
};
