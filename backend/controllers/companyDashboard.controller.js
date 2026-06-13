import { getCompanyDashboard } from "../services/dashboard.service.js";

export const getDashboard = async (req, res) => {
  const data = await getCompanyDashboard({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    data,
  });
};
