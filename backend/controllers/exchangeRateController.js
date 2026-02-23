import CompanyExchangeRate from "../models/CompanyExchangeRate.js";

export const setExchangeRate = async (req, res) => {
  const { role, companyId } = req.context;

  if (role !== "manager") {
    return res.status(403).json({ message: "Manager only" });
  }

  const { rate } = req.body;
  if (!rate || rate <= 0) {
    return res.status(400).json({ message: "Invalid rate" });
  }

  const exchangeRate = await CompanyExchangeRate.findOneAndUpdate(
    {
      company: companyId,
    },
    {
      rate,
      setBy: req.user.id,
      effectiveFrom: new Date(),
    },
    {
      upsert: true,
      new: true,
    },
  );
  res.json({ success: true, data: exchangeRate });
};
