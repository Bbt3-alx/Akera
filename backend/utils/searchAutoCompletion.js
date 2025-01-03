import Company from "../models/Company.js";

export const searchCompany = async (req, res) => {
  const { name } = req.query;
  try {
    const companies = await Company.find({
      name: { $regex: name, $options: "i" },
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ mesage: error.message });
  }
};
