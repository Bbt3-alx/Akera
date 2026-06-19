import {
  normalizeCompanyEnabledModules,
  normalizeCompanyTransferWorkflows,
} from "../constants/companyModules.js";

export function serializeUser(user) {
  const firstName = user.firstName;
  const lastName = user.lastName;

  return {
    id: user._id,
    email: user.email,
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" "),
    isVerified: user.isVerified,
  };
}

export function serializeMembership(membership) {
  const company = membership.company;
  const enabledModules = normalizeCompanyEnabledModules(company);
  const transferWorkflows = normalizeCompanyTransferWorkflows(company);

  return {
    membershipId: membership._id,
    companyId: company?._id,
    companyName: company?.name,
    company: company
      ? {
          id: company._id,
          name: company.name,
          businessType: company.businessType || "transfer",
          transferWorkflows,
          enabledModules,
        }
      : null,
    companyBusinessType: company?.businessType || "transfer",
    companyTransferWorkflows: transferWorkflows,
    companyEnabledModules: enabledModules,
    role: membership.role,
    permissions: membership.permissions || [],
    status: membership.status,
  };
}
