import {
  cancelRemoteAgentPayout,
  createRemoteAgentDeposit,
  createRemoteAgentPayout,
  getRemoteAgentPayoutByCode,
  listRemoteAgentPayouts,
  lookupRemoteAgentPayoutByBeneficiaryCode,
  payRemoteAgentPayout,
} from "../services/remoteAgentPayout.service.js";
import { listRemoteAgentOperations } from "../services/remoteAgentOperation.service.js";
import {
  addRemoteAgentGroupMember,
  createRemoteAgentGroup,
  getRemoteAgentGroup,
  listEligibleRemoteAgents,
  listMyRemoteAgentGroups,
  listRemoteAgentGroups,
  updateRemoteAgentGroup,
  updateRemoteAgentGroupMember,
} from "../services/remoteAgentGroup.service.js";
import {
  serializeEligibleRemoteAgents,
  serializeRemoteAgentGroup,
  serializeRemoteAgentGroups,
} from "../serializers/remoteAgentGroup.serializer.js";
import {
  serializeRemoteAgentPayout,
  serializeRemoteAgentPayouts,
} from "../serializers/remoteAgentPayout.serializer.js";
import { serializeRemoteAgentOperations } from "../serializers/remoteAgentOperation.serializer.js";
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

export const listOperations = async (req, res) => {
  const result = await listRemoteAgentOperations({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    code: 200,
    pagination: result.pagination,
    data: serializeRemoteAgentOperations(result.operations),
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
  const result = await listRemoteAgentGroups({
    companyId: req.context.companyId,
    filters: req.query,
    pagination: req.query,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: serializeRemoteAgentGroups(result.groups),
  });
};

export const listMyGroups = async (req, res) => {
  const groups = await listMyRemoteAgentGroups({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentGroups(groups),
  });
};

export const listEligibleAgents = async (req, res) => {
  const agents = await listEligibleRemoteAgents({
    companyId: req.context.companyId,
    role: req.context.role,
    search: req.query.search,
    groupId: req.query.groupId,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    data: serializeEligibleRemoteAgents(agents),
  });
};

export const getGroup = async (req, res) => {
  const group = await getRemoteAgentGroup({
    companyId: req.context.companyId,
    groupId: req.params.groupId,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentGroup(group),
  });
};

export const createGroup = async (req, res) => {
  const group = await createRemoteAgentGroup({
    companyId: req.context.companyId,
    managerId: req.user.id,
    managerMembershipId: req.context.membershipId,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: group._id,
    targetCode: group.name,
    metadata: {
      groupId: group._id,
      name: group.name,
      status: group.status,
      actorMembership: req.context.membershipId,
    },
  };

  res.status(201).json({
    success: true,
    data: serializeRemoteAgentGroup(group),
  });
};

export const updateGroup = async (req, res) => {
  const group = await updateRemoteAgentGroup({
    companyId: req.context.companyId,
    groupId: req.params.groupId,
    managerId: req.user.id,
    managerMembershipId: req.context.membershipId,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: group._id,
    targetCode: group.name,
    metadata: {
      groupId: group._id,
      name: group.name,
      status: group.status,
      actorMembership: req.context.membershipId,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentGroup(group),
  });
};

export const addGroupMember = async (req, res) => {
  const group = await addRemoteAgentGroupMember({
    companyId: req.context.companyId,
    groupId: req.params.groupId,
    membershipId: req.body.membershipId,
    managerId: req.user.id,
    managerMembershipId: req.context.membershipId,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: group._id,
    targetCode: group.name,
    metadata: {
      groupId: group._id,
      name: group.name,
      actorMembership: req.context.membershipId,
      memberMembership: req.body.membershipId,
      role: req.body.role,
      permissions: req.body.permissions,
      status: req.body.status,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentGroup(group),
  });
};

export const updateGroupMember = async (req, res) => {
  const group = await updateRemoteAgentGroupMember({
    companyId: req.context.companyId,
    groupId: req.params.groupId,
    membershipId: req.params.membershipId,
    managerId: req.user.id,
    managerMembershipId: req.context.membershipId,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: group._id,
    targetCode: group.name,
    metadata: {
      groupId: group._id,
      name: group.name,
      actorMembership: req.context.membershipId,
      memberMembership: req.params.membershipId,
      role: req.body.role,
      permissions: req.body.permissions,
      status: req.body.status,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeRemoteAgentGroup(group),
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
