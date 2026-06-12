import {
  getCurrentCompanyExchangeRate,
  upsertCompanyExchangeRate,
} from "../services/companyExchangeRate.service.js";
import { serializeCompanyExchangeRate } from "../serializers/companyExchangeRate.serializer.js";

export const getExchangeRate = async (req, res) => {
  const exchangeRate = await getCurrentCompanyExchangeRate({
    companyId: req.context.companyId,
  });

  res.status(200).json({
    success: true,
    data: serializeCompanyExchangeRate(exchangeRate),
  });
};

export const updateExchangeRate = async (req, res) => {
  const exchangeRate = await upsertCompanyExchangeRate({
    companyId: req.context.companyId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });

  res.status(200).json({
    success: true,
    data: serializeCompanyExchangeRate(exchangeRate),
  });
};

export const setExchangeRate = updateExchangeRate;
