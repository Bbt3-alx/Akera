import { getTrialBalance } from "../services/accounting.service.js";

export const trialBalance = async (req, res) => {
  const { companyId } = req.context;

  const result = await getTrialBalance(companyId);

  res.json({
    success: true,
    data: result,
  });
};
