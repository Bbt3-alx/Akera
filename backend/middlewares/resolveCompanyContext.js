import CompanyMembership from "../models/CompanyMembership.js";

const resolveCompanyContext = async (req, res, next) => {
  try {
    const companyId =
      req.headers["X-Company-Id"] || req.headers["x-company-id"];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing X-Company-Id header",
      });
    }

    const membership = await CompanyMembership.findOne({
      user: req.user.id,
      company: companyId,
      status: "active",
    })
      .populate("company")
      .lean();

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this company",
      });
    }

    // Active context
    req.context = {
      company: membership.company,
      companyId: membership.company._id,
      role: membership.role,
      membershipId: membership._id,
    };

    next();
  } catch (error) {
    console.error("Resolve company context error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve company context",
    });
  }
};

export default resolveCompanyContext;
