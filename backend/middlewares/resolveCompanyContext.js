import CompanyMembership from "../models/CompanyMembership.js";
import { ApiError } from "./errorHandler.js";

const resolveCompanyContext = async (req, res, next) => {
  try {
    const companyId =
      req.headers["X-Company-Id"] || req.headers["x-company-id"];

    if (!companyId) {
      return next(
        new ApiError(
          400,
          "Company ID header (X-Company-Id) is required",
          "COMPANY_ID_MISSING"
        )
      );
    }

    const membership = await CompanyMembership.findOne({
      user: req.user.id,
      company: companyId,
      status: "active",
    })
      .populate("company")
      .lean();

    if (!membership) {
      return next(
        new ApiError(
          403,
          "You don't have access to this company",
          "COMPANY_ACCESS_DENIED"
        )
      );
    }

    // Active context
    req.context = {
      company: membership.company,
      companyId: membership.company._id,
      role: membership.role,
      permissions: membership.permissions || [],
      membershipId: membership._id,
    };

    next();
  } catch (error) {
    if(process.env.NODE_ENV === "development"){
      console.error("Error resolving company context:", error);
    }
    return next(
      new ApiError(
        500,
        "Failed to resolve company context",
        "COMPANY_CONTEXT_FAILED"
      )
    );
  }
};

export default resolveCompanyContext;
