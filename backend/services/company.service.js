import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import { ApiError } from "../middlewares/errorHandler.js";
import {
  ALLOWED_COMPANY_BUSINESS_TYPES,
  ALLOWED_TRANSFER_WORKFLOWS,
  BOTH_TRANSFER_WORKFLOWS,
  COMPANY_BUSINESS_TYPES,
  DEFAULT_TRANSFER_WORKFLOWS,
  deriveEnabledModulesFromBusinessType,
  normalizeTransferWorkflows,
} from "../constants/companyModules.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { generateCompanyCode } from "../utils/generateCompanyCode.js";

const VALID_BASE_CURRENCIES = new Set(["FCFA", "GNF"]);
const MAX_CODE_GENERATION_ATTEMPTS = 5;

const normalizeRequiredString = (value) =>
  typeof value === "string" ? value.trim() : "";

const validateCreateCompanyPayload = ({
  name,
  address,
  contact,
  baseCurrency,
  businessType,
  requestedTransferWorkflows,
}) => {
  const missingFields = [];

  if (!name) missingFields.push("name");
  if (!address) missingFields.push("address");
  if (!contact) missingFields.push("contact");
  if (!baseCurrency) missingFields.push("baseCurrency");

  if (missingFields.length > 0) {
    throw new ApiError(
      400,
      `Missing required fields: ${missingFields.join(", ")}`,
      "VALIDATION_ERROR",
    );
  }

  if (!VALID_BASE_CURRENCIES.has(baseCurrency)) {
    throw new ApiError(
      400,
      "baseCurrency must be one of: FCFA, GNF",
      "VALIDATION_ERROR",
    );
  }

  if (!ALLOWED_COMPANY_BUSINESS_TYPES.includes(businessType)) {
    throw new ApiError(
      400,
      "businessType must be one of: transfer, gold_trading, mixed",
      "VALIDATION_ERROR",
    );
  }

  if (
    requestedTransferWorkflows.some(
      (workflow) => !ALLOWED_TRANSFER_WORKFLOWS.includes(workflow),
    )
  ) {
    throw new ApiError(
      400,
      "transferWorkflows must include only: correspondent_collection, remote_agent_payout",
      "VALIDATION_ERROR",
    );
  }
};

const generateUniqueCompanyCode = async ({ name, session }) => {
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateCompanyCode(name);
    const existingCompany = await Company.exists({ code }).session(session);

    if (!existingCompany) {
      return code;
    }
  }

  throw new ApiError(
    500,
    "Failed to generate a unique company code",
    "COMPANY_CODE_GENERATION_FAILED",
  );
};

const serializeCreatedCompany = (company) => ({
  id: company._id,
  name: company.name,
  code: company.code,
  baseCurrency: company.baseCurrency,
  currency: company.baseCurrency,
  businessType: company.businessType,
  transferWorkflows: company.transferWorkflows || [...DEFAULT_TRANSFER_WORKFLOWS],
  enabledModules: company.enabledModules || [],
});

const serializeCreatedMembership = ({ membership, company }) => ({
  membershipId: membership._id,
  companyId: company._id,
  companyName: company.name,
  role: membership.role,
  status: membership.status,
  permissions: membership.permissions || [],
});

export async function createCompanyForUser({ userId, payload = {} }) {
  if (!userId) {
    throw new ApiError(401, "Authenticated user is required", "AUTH_REQUIRED");
  }

  const name = normalizeRequiredString(payload.name);
  const address = normalizeRequiredString(payload.address);
  const contact = normalizeRequiredString(payload.contact);
  const baseCurrency = normalizeRequiredString(
    payload.baseCurrency || payload.currency,
  );
  const businessType =
    normalizeRequiredString(payload.businessType) || COMPANY_BUSINESS_TYPES.TRANSFER;
  const requestedTransferWorkflows = Array.isArray(payload.transferWorkflows)
    ? payload.transferWorkflows
    : [payload.transferWorkflows].filter(Boolean);
  const transferWorkflows =
    businessType === COMPANY_BUSINESS_TYPES.MIXED
      ? [...BOTH_TRANSFER_WORKFLOWS]
      : normalizeTransferWorkflows(requestedTransferWorkflows);
  const enabledModules = deriveEnabledModulesFromBusinessType(
    businessType,
    transferWorkflows,
  );

  validateCreateCompanyPayload({
    name,
    address,
    contact,
    baseCurrency,
    businessType,
    requestedTransferWorkflows,
  });

  return runTransaction(async (session) => {
    const duplicateCompany = await Company.findOne({
      $or: [{ name }, { contact }],
    })
      .select("_id")
      .session(session)
      .lean();

    if (duplicateCompany) {
      throw new ApiError(
        409,
        "Company with this name or contact already exists.",
        "COMPANY_ALREADY_EXISTS",
      );
    }

    const code = await generateUniqueCompanyCode({ name, session });

    const [company] = await Company.create(
      [
        {
          name,
          address,
          contact,
          code,
          manager: userId,
          baseCurrency,
          businessType,
          transferWorkflows,
          enabledModules,
        },
      ],
      { session },
    );

    const [membership] = await CompanyMembership.create(
      [
        {
          user: userId,
          company: company._id,
          role: "manager",
          status: "active",
          currency: baseCurrency,
          permissions: [],
        },
      ],
      { session },
    );

    return {
      company: serializeCreatedCompany(company),
      membership: serializeCreatedMembership({ membership, company }),
    };
  });
}
