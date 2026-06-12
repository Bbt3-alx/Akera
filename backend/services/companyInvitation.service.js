import Company from "../models/Company.js";
import CompanyInvitation from "../models/CompanyInvitation.js";
import CompanyMembership from "../models/CompanyMembership.js";
import User from "../models/User.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VALID_INVITATION_ROLES = new Set(["partner", "employee"]);
const VALID_INVITATION_STATUSES = new Set([
  "pending",
  "accepted",
  "rejected",
  "expired",
  "revoked",
]);
const VALID_CURRENCIES = new Set(["FCFA", "GNF"]);

export async function createCompanyInvitation({
  companyId,
  managerId,
  managerRole,
  payload = {},
}) {
  assertManagerRole(managerRole);

  const email = normalizeEmail(payload.email);
  validateEmail(email);
  validateInvitationRole(payload.role);
  validatePartnerCurrency(payload.role, payload.currency);
  const startingBalance = normalizeStartingBalance(payload.startingBalance);

  return runTransaction(async (session) => {
    const company = await Company.findById(companyId).session(session);

    if (!company) {
      throw new ApiError(404, "Company not found", "COMPANY_NOT_FOUND");
    }

    const currency =
      payload.role === "partner" ? payload.currency : company.baseCurrency;
    const normalizedStartingBalance =
      payload.role === "partner" ? startingBalance : 0;

    const existingUser = await User.findOne({ email }).session(session);

    if (existingUser) {
      const existingMembership = await CompanyMembership.findOne({
        user: existingUser._id,
        company: companyId,
      }).session(session);

      if (existingMembership) {
        throw new ApiError(
          409,
          "User is already a member of this company",
          "MEMBERSHIP_ALREADY_EXISTS",
        );
      }
    }

    const duplicateInvitation = await CompanyInvitation.findOne({
      email,
      company: companyId,
      status: "pending",
    }).session(session);

    if (duplicateInvitation) {
      throw new ApiError(
        409,
        "A pending invitation already exists for this email",
        "INVITATION_ALREADY_PENDING",
      );
    }

    const [invitation] = await CompanyInvitation.create(
      [
        {
          email,
          company: companyId,
          role: payload.role,
          currency,
          startingBalance: normalizedStartingBalance,
          invitedBy: managerId,
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
      ],
      { session },
    );

    return invitation;
  });
}

export async function listCompanyInvitations({
  companyId,
  managerRole,
  status,
}) {
  assertManagerRole(managerRole);
  validateStatusFilter(status);

  const filter = {
    company: companyId,
    ...(status && { status }),
  };

  return CompanyInvitation.find(filter)
    .sort({ createdAt: -1 })
    .populate("company", "name code baseCurrency")
    .populate("invitedBy", "firstName lastName name email")
    .lean();
}

export async function listMyInvitations({ email }) {
  const normalizedEmail = normalizeEmail(email);
  validateEmail(normalizedEmail);

  return CompanyInvitation.find({
    email: normalizedEmail,
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .populate("company", "name code baseCurrency")
    .populate("invitedBy", "firstName lastName name email")
    .lean();
}

export async function acceptCompanyInvitation({
  invitationId,
  userId,
  userEmail,
}) {
  const email = normalizeEmail(userEmail);
  validateEmail(email);

  return runTransaction(async (session) => {
    const invitation = await CompanyInvitation.findOne({
      _id: invitationId,
      email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!invitation) {
      throw new ApiError(
        404,
        "Invitation not found",
        "INVITATION_NOT_FOUND",
      );
    }

    const existingMembership = await CompanyMembership.findOne({
      user: userId,
      company: invitation.company,
    }).session(session);

    if (existingMembership) {
      throw new ApiError(
        409,
        "User is already a member of this company",
        "MEMBERSHIP_ALREADY_EXISTS",
      );
    }

    const [membership] = await CompanyMembership.create(
      [
        {
          user: userId,
          company: invitation.company,
          role: invitation.role,
          status: "active",
          currency: invitation.currency,
          balance: invitation.startingBalance || 0,
          invitedBy: invitation.invitedBy,
          permissions: [],
        },
      ],
      { session },
    );

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save({ session });

    return { invitation, membership };
  });
}

export async function rejectCompanyInvitation({
  invitationId,
  userEmail,
}) {
  const email = normalizeEmail(userEmail);
  validateEmail(email);

  return runTransaction(async (session) => {
    const invitation = await CompanyInvitation.findOne({
      _id: invitationId,
      email,
      status: "pending",
    }).session(session);

    if (!invitation) {
      throw new ApiError(
        404,
        "Invitation not found",
        "INVITATION_NOT_FOUND",
      );
    }

    invitation.status = "rejected";
    invitation.rejectedAt = new Date();
    await invitation.save({ session });

    return invitation;
  });
}

export async function revokeCompanyInvitation({
  invitationId,
  companyId,
  managerId,
  managerRole,
}) {
  assertManagerRole(managerRole);

  return runTransaction(async (session) => {
    const invitation = await CompanyInvitation.findOne({
      _id: invitationId,
      company: companyId,
      status: "pending",
    }).session(session);

    if (!invitation) {
      throw new ApiError(
        404,
        "Invitation not found",
        "INVITATION_NOT_FOUND",
      );
    }

    invitation.status = "revoked";
    invitation.revokedAt = new Date();
    invitation.revokedBy = managerId;
    await invitation.save({ session });

    return invitation;
  });
}

function assertManagerRole(role) {
  if (role !== "manager") {
    throw new ApiError(
      403,
      "Only managers can manage invitations",
      "INVITATION_MANAGER_REQUIRED",
    );
  }
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : undefined;
}

function validateEmail(email) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError(
      422,
      "A valid email is required",
      "INVALID_INVITATION_EMAIL",
    );
  }
}

function validateInvitationRole(role) {
  if (!VALID_INVITATION_ROLES.has(role)) {
    throw new ApiError(
      400,
      "Invitation role must be partner or employee",
      "INVALID_INVITATION_ROLE",
    );
  }
}

function validatePartnerCurrency(role, currency) {
  if (role === "partner" && !VALID_CURRENCIES.has(currency)) {
    throw new ApiError(
      400,
      "Partner invitation currency must be FCFA or GNF",
      "INVALID_INVITATION_CURRENCY",
    );
  }
}

function normalizeStartingBalance(startingBalance) {
  if (startingBalance === undefined || startingBalance === null) {
    return 0;
  }

  const parsedBalance = Number(startingBalance);

  if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
    throw new ApiError(
      400,
      "Starting balance must be greater than or equal to 0",
      "INVALID_STARTING_BALANCE",
    );
  }

  return parsedBalance;
}

function validateStatusFilter(status) {
  if (status && !VALID_INVITATION_STATUSES.has(status)) {
    throw new ApiError(
      400,
      "Invalid invitation status",
      "INVALID_INVITATION_STATUS",
    );
  }
}
