import {
  cancelRemoteAgentPayout,
  createRemoteAgentDeposit,
  createRemoteAgentPayout,
  getRemoteAgentPayoutByCode,
  listRemoteAgentGroups,
  listRemoteAgentPayouts,
  lookupRemoteAgentPayoutByBeneficiaryCode,
  payRemoteAgentPayout,
} from "../services/remoteAgentPayout.service.js";
import {
  serializeRemoteAgentPayout,
  serializeRemoteAgentPayouts,
} from "../serializers/remoteAgentPayout.serializer.js";
import { serializeAccountOperation } from "../serializers/accountOperation.serializer.js";

export const listPayouts = async (req, res) => {
  const result = await listRemoteAgentPayouts({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    code: 200,
    pagination: result.pagination,
    data: serializeRemoteAgentPayouts(result.payouts),
  });
};

export const createPayout = async (req, res) => {
  const result = await createRemoteAgentPayout({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });
  const data = {
    payout: serializeRemoteAgentPayout(result.payout),
    ...(result.beneficiaryCode && { beneficiaryCode: result.beneficiaryCode }),
  };

  res.locals.audit = {
    targetId: result.payout._id,
    targetCode: result.payout.payoutCode,
    metadata: {
      payoutCode: result.payout.payoutCode,
      amount: result.payout.amount,
      currency: result.payout.currency,
      status: result.payout.status,
      assignedAgentGroup: result.payout.assignedAgentGroup,
      beneficiaryCodeLast4: result.payout.beneficiaryCodeLast4,
    },
  };

  res.status(201).json({
    success: true,
    data,
  });
};

export const listGroups = async (req, res) => {
  const groups = await listRemoteAgentGroups({
    companyId: req.context.companyId,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    data: groups.map((group) => serializeGroup(group)),
  });
};

export const createAgentDeposit = async (req, res) => {
  const operation = await createRemoteAgentDeposit({
    companyId: req.context.companyId,
    groupId: req.params.groupId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: operation._id,
    targetCode: operation.operationCode,
    metadata: {
      type: operation.type,
      workflow: operation.workflow,
      amount: operation.amount,
      currency: operation.currency,
      status: operation.status,
      linkedRemoteAgentGroup: operation.linkedRemoteAgentGroup,
      performedByMembership: operation.performedByMembership,
      depositedByMembership: operation.depositedByMembership,
      previousBalance: operation.previousBalance,
      currentBalance: operation.currentBalance,
    },
  };

  res.status(201).json({
    success: true,
    data: serializeAccountOperation(operation),
  });
};

export const lookupPayout = async (req, res) => {
  const payout = await lookupRemoteAgentPayoutByBeneficiaryCode({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
    payload: req.body,
  });

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentPayout(payout),
  });
};

export const getPayout = async (req, res) => {
  const payout = await getRemoteAgentPayoutByCode({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
    payoutCode: req.params.payoutCode,
  });

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentPayout(payout),
  });
};

export const payPayout = async (req, res) => {
  const payout = await payRemoteAgentPayout({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payoutCode: req.params.payoutCode,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: payout._id,
    targetCode: payout.payoutCode,
    metadata: {
      payoutCode: payout.payoutCode,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      assignedAgentGroup: payout.assignedAgentGroup,
      beneficiaryCodeLast4: payout.beneficiaryCodeLast4,
      accountOperation: payout.accountOperation,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentPayout(payout),
  });
};

export const cancelPayout = async (req, res) => {
  const payout = await cancelRemoteAgentPayout({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payoutCode: req.params.payoutCode,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: payout._id,
    targetCode: payout.payoutCode,
    metadata: {
      payoutCode: payout.payoutCode,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      assignedAgentGroup: payout.assignedAgentGroup,
      beneficiaryCodeLast4: payout.beneficiaryCodeLast4,
      cancelReason: payout.cancelReason,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentPayout(payout),
  });
};

function serializeGroup(group) {
  const balance = toNumber(group.balance);
  const reservedBalance = toNumber(group.reservedBalance);

  return {
    id: serializeId(group._id ?? group.id),
    name: group.name,
    balance,
    reservedBalance,
    availableBalance: balance - reservedBalance,
    currency: group.currency,
    status: group.status,
    members: Array.isArray(group.members)
      ? group.members.map((member) => ({
          membership: serializeId(member.membership),
          role: member.role,
          permissions: member.permissions,
          status: member.status,
        }))
      : [],
  };
}

function serializeId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (typeof value === "object") {
    return serializeId(value._id ?? value.id);
  }

  return value.toString();
}

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
