export const COMPANY_BUSINESS_TYPES = Object.freeze({
  TRANSFER: "transfer",
  GOLD_TRADING: "gold_trading",
  MIXED: "mixed",
});

export const COMPANY_MODULES = Object.freeze({
  TRANSFERS: "transfers",
  CORRESPONDENT_COLLECTIONS: "correspondent_collections",
  REMOTE_AGENT_PAYOUT: "remote_agent_payout",
  ACCOUNT_OPERATIONS: "account_operations",
  GOLD_TRADING: "gold_trading",
  GOLD_BUY_OPERATIONS: "gold_buy_operations",
  GOLD_SELL_OPERATIONS: "gold_sell_operations",
  GOLD_SHIPPING: "gold_shipping",
  COMPANY_CASH: "company_cash",
  EXCHANGE_RATE: "exchange_rate",
});

export const TRANSFER_WORKFLOWS = Object.freeze({
  CORRESPONDENT_COLLECTION: "correspondent_collection",
  REMOTE_AGENT_PAYOUT: "remote_agent_payout",
});

export const DEFAULT_TRANSFER_WORKFLOWS = Object.freeze([
  TRANSFER_WORKFLOWS.CORRESPONDENT_COLLECTION,
]);

export const BOTH_TRANSFER_WORKFLOWS = Object.freeze([
  TRANSFER_WORKFLOWS.CORRESPONDENT_COLLECTION,
  TRANSFER_WORKFLOWS.REMOTE_AGENT_PAYOUT,
]);

export const TRANSFER_COMPANY_MODULES = Object.freeze([
  COMPANY_MODULES.TRANSFERS,
  COMPANY_MODULES.CORRESPONDENT_COLLECTIONS,
  COMPANY_MODULES.ACCOUNT_OPERATIONS,
  COMPANY_MODULES.COMPANY_CASH,
  COMPANY_MODULES.EXCHANGE_RATE,
]);

export const REMOTE_AGENT_PAYOUT_COMPANY_MODULES = Object.freeze([
  COMPANY_MODULES.TRANSFERS,
  COMPANY_MODULES.REMOTE_AGENT_PAYOUT,
  COMPANY_MODULES.ACCOUNT_OPERATIONS,
  COMPANY_MODULES.COMPANY_CASH,
]);

export const BOTH_TRANSFER_WORKFLOW_MODULES = Object.freeze([
  COMPANY_MODULES.TRANSFERS,
  COMPANY_MODULES.CORRESPONDENT_COLLECTIONS,
  COMPANY_MODULES.REMOTE_AGENT_PAYOUT,
  COMPANY_MODULES.ACCOUNT_OPERATIONS,
  COMPANY_MODULES.COMPANY_CASH,
  COMPANY_MODULES.EXCHANGE_RATE,
]);

export const GOLD_TRADING_COMPANY_MODULES = Object.freeze([
  COMPANY_MODULES.GOLD_TRADING,
  COMPANY_MODULES.GOLD_BUY_OPERATIONS,
  COMPANY_MODULES.GOLD_SELL_OPERATIONS,
  COMPANY_MODULES.GOLD_SHIPPING,
  COMPANY_MODULES.COMPANY_CASH,
]);

export const MIXED_COMPANY_MODULES = Object.freeze([
  ...BOTH_TRANSFER_WORKFLOW_MODULES,
  COMPANY_MODULES.GOLD_TRADING,
  COMPANY_MODULES.GOLD_BUY_OPERATIONS,
  COMPANY_MODULES.GOLD_SELL_OPERATIONS,
  COMPANY_MODULES.GOLD_SHIPPING,
]);

export const ALLOWED_COMPANY_BUSINESS_TYPES = Object.freeze(
  Object.values(COMPANY_BUSINESS_TYPES),
);

export const ALLOWED_COMPANY_MODULES = Object.freeze(
  Object.values(COMPANY_MODULES),
);

export const ALLOWED_TRANSFER_WORKFLOWS = Object.freeze(
  Object.values(TRANSFER_WORKFLOWS),
);

export function normalizeTransferWorkflows(transferWorkflows) {
  const workflows = Array.isArray(transferWorkflows)
    ? transferWorkflows
    : [transferWorkflows].filter(Boolean);
  const validWorkflows = workflows.filter((workflow) =>
    ALLOWED_TRANSFER_WORKFLOWS.includes(workflow),
  );

  return validWorkflows.length > 0
    ? [...new Set(validWorkflows)]
    : [...DEFAULT_TRANSFER_WORKFLOWS];
}

export function deriveEnabledModulesFromTransferWorkflows(transferWorkflows) {
  const workflows = normalizeTransferWorkflows(transferWorkflows);
  const hasCorrespondentCollection = workflows.includes(
    TRANSFER_WORKFLOWS.CORRESPONDENT_COLLECTION,
  );
  const hasRemoteAgentPayout = workflows.includes(
    TRANSFER_WORKFLOWS.REMOTE_AGENT_PAYOUT,
  );

  if (hasCorrespondentCollection && hasRemoteAgentPayout) {
    return [...BOTH_TRANSFER_WORKFLOW_MODULES];
  }

  if (hasRemoteAgentPayout) {
    return [...REMOTE_AGENT_PAYOUT_COMPANY_MODULES];
  }

  return [...TRANSFER_COMPANY_MODULES];
}

export function deriveEnabledModulesFromBusinessType(
  businessType,
  transferWorkflows,
) {
  switch (businessType || COMPANY_BUSINESS_TYPES.TRANSFER) {
    case COMPANY_BUSINESS_TYPES.TRANSFER:
      return deriveEnabledModulesFromTransferWorkflows(transferWorkflows);
    case COMPANY_BUSINESS_TYPES.GOLD_TRADING:
      return [...GOLD_TRADING_COMPANY_MODULES];
    case COMPANY_BUSINESS_TYPES.MIXED:
      return [...MIXED_COMPANY_MODULES];
    default:
      return [...TRANSFER_COMPANY_MODULES];
  }
}

export function normalizeCompanyEnabledModules(company) {
  const enabledModules = Array.isArray(company?.enabledModules)
    ? company.enabledModules.filter((moduleName) =>
        ALLOWED_COMPANY_MODULES.includes(moduleName),
      )
    : [];

  if (enabledModules.length > 0) {
    return [...enabledModules];
  }

  return deriveEnabledModulesFromBusinessType(
    company?.businessType,
    company?.transferWorkflows,
  );
}

export function normalizeCompanyTransferWorkflows(company) {
  return normalizeTransferWorkflows(company?.transferWorkflows);
}
