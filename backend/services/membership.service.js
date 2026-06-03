import CompanyMembership from "../models/CompanyMembership.js";

export async function fetchActiveMemberships(userId) {
  return CompanyMembership.find({
    user: userId,
    status: "active",
  })
    .populate("company")
    .lean();
}
