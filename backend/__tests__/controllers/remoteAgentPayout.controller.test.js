import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  addGroupMember,
  createAgentDeposit,
  createGroup,
  createPayout,
  getGroup,
  listEligibleAgents,
  listGroups,
  listMyGroups,
  payPayout,
  updateGroupMember,
} from "../../controllers/remoteAgentPayout.controller.js";
import * as remoteAgentGroupService from "../../services/remoteAgentGroup.service.js";
import * as remoteAgentPayoutService from "../../services/remoteAgentPayout.service.js";

describe("remote agent payout controller", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lists groups with direct member agent names", async () => {
    const ids = createIds();
    const group = createGroupRecord(ids);
    jest
      .spyOn(remoteAgentGroupService, "listRemoteAgentGroups")
      .mockResolvedValue({
        groups: [group],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    const res = createResponse();

    await listGroups(createRequest(ids), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data[0].members[0]).toEqual(
      expect.objectContaining({
        agentName: "Moussa Keita",
        agentEmail: "moussa@example.com",
      }),
    );
  });

  it("lists my groups with direct member names and current member permissions", async () => {
    const ids = createIds();
    const group = {
      ...createGroupRecord(ids),
      currentMemberRole: "agent",
      currentMemberPermissions: [
        "remote_payout:view",
        "remote_payout:deposit",
      ],
      transactionPin: "123456",
      beneficiaryCode: "87654321",
    };
    jest
      .spyOn(remoteAgentGroupService, "listMyRemoteAgentGroups")
      .mockResolvedValue([group]);
    const res = createResponse();

    await listMyGroups(
      createRequest(ids, {
        context: {
          companyId: ids.companyId,
          membershipId: ids.payAgentMembershipId,
          role: "employee",
        },
      }),
      res,
    );

    expect(remoteAgentGroupService.listMyRemoteAgentGroups)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        membershipId: ids.payAgentMembershipId,
        role: "employee",
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data[0]).toEqual(
      expect.objectContaining({
        currentMemberRole: "agent",
        currentMemberPermissions: [
          "remote_payout:view",
          "remote_payout:deposit",
        ],
      }),
    );
    expect(res.json.mock.calls[0][0].data[0].members[0]).toEqual(
      expect.objectContaining({
        agentName: "Moussa Keita",
        agentEmail: "moussa@example.com",
      }),
    );
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("123456");
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("87654321");
  });

  it("lists eligible agents with safe display identity fields", async () => {
    const ids = createIds();
    const eligibleAgent = {
      membershipId: ids.payAgentMembershipId.toHexString(),
      userId: ids.payAgentUserId.toHexString(),
      name: "Moussa Keita",
      email: "moussa@example.com",
      role: "employee",
      status: "active",
      currency: "FCFA",
      isAlreadyInGroup: false,
      groupMemberStatus: null,
      password: "secret-password",
      transactionPinHash: "secret-pin-hash",
    };
    jest
      .spyOn(remoteAgentGroupService, "listEligibleRemoteAgents")
      .mockResolvedValue([eligibleAgent]);
    const res = createResponse();

    await listEligibleAgents(
      createRequest(ids, {
        query: {
          search: "moussa",
          groupId: ids.groupId.toHexString(),
          limit: "50",
        },
      }),
      res,
    );

    expect(remoteAgentGroupService.listEligibleRemoteAgents)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        role: "manager",
        search: "moussa",
        groupId: ids.groupId.toHexString(),
        limit: "50",
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toEqual({
      success: true,
      data: [
        {
          membershipId: ids.payAgentMembershipId.toHexString(),
          userId: ids.payAgentUserId.toHexString(),
          name: "Moussa Keita",
          email: "moussa@example.com",
          role: "employee",
          status: "active",
          currency: "FCFA",
          isAlreadyInGroup: false,
          groupMemberStatus: null,
        },
      ],
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(
      "secret-password",
    );
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(
      "secret-pin-hash",
    );
  });

  it("gets a group with direct member agent names", async () => {
    const ids = createIds();
    const group = createGroupRecord(ids);
    jest
      .spyOn(remoteAgentGroupService, "getRemoteAgentGroup")
      .mockResolvedValue(group);
    const res = createResponse();

    await getGroup(
      createRequest(ids, {
        params: { groupId: ids.groupId.toHexString() },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.members[0]).toEqual(
      expect.objectContaining({
        agentName: "Moussa Keita",
        agentEmail: "moussa@example.com",
      }),
    );
  });

  it("creates a remote agent group response with safe audit metadata", async () => {
    const ids = createIds();
    const group = createGroupRecord(ids);
    jest
      .spyOn(remoteAgentGroupService, "createRemoteAgentGroup")
      .mockResolvedValue(group);
    const res = createResponse();

    await createGroup(createRequest(ids), res);

    expect(remoteAgentGroupService.createRemoteAgentGroup)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: expect.objectContaining({ transactionPin: "123456" }),
      });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        id: ids.groupId.toHexString(),
        name: "Agents Bamako",
        availableBalance: 75000,
      }),
    );
    expect(res.json.mock.calls[0][0].data.members[0]).toEqual(
      expect.objectContaining({
        agentName: "Moussa Keita",
        agentEmail: "moussa@example.com",
      }),
    );
    expect(res.locals.audit).toEqual({
      targetId: ids.groupId,
      targetCode: "Agents Bamako",
      metadata: {
        groupId: ids.groupId,
        name: "Agents Bamako",
        status: "active",
        actorMembership: ids.managerMembershipId,
      },
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });

  it("creates a payout response with one-time beneficiary code and safe audit metadata", async () => {
    const ids = createIds();
    const payout = createPayoutRecord(ids);
    jest
      .spyOn(remoteAgentPayoutService, "createRemoteAgentPayout")
      .mockResolvedValue({
        payout,
        beneficiaryCode: "87654321",
      });
    const res = createResponse();

    await createPayout(createRequest(ids), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        payout: expect.objectContaining({
          id: ids.payoutId.toHexString(),
          payoutCode: "RAP-260620-ABCD",
          beneficiaryCodeLast4: "4321",
        }),
        beneficiaryCode: "87654321",
      },
    });
    expect(JSON.stringify(res.json.mock.calls[0][0].data.payout)).not.toContain(
      "secret-hash",
    );
    expect(JSON.stringify(res.json.mock.calls[0][0].data.payout)).not.toContain(
      "payout-1",
    );
    expect(res.locals.audit).toEqual({
      targetId: ids.payoutId,
      targetCode: "RAP-260620-ABCD",
      metadata: {
        payoutCode: "RAP-260620-ABCD",
        amount: 25000,
        currency: "FCFA",
        status: "pending",
        assignedAgentGroup: ids.groupId,
        beneficiaryCodeLast4: "4321",
      },
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("87654321");
    expect(JSON.stringify(res.locals.audit)).not.toContain("secret-hash");
    expect(JSON.stringify(res.locals.audit)).not.toContain("transactionPin");
    expect(JSON.stringify(res.locals.audit)).not.toContain("payout-1");
  });

  it("returns paid payout safely and does not audit secret payment fields", async () => {
    const ids = createIds();
    const payout = createPayoutRecord(ids, {
      accountOperation: ids.operationId,
      paymentIdempotencyKey: "pay-1",
      status: "paid",
    });
    jest
      .spyOn(remoteAgentPayoutService, "payRemoteAgentPayout")
      .mockResolvedValue(payout);
    const res = createResponse();

    await payPayout(
      createRequest(ids, {
        body: {
          beneficiaryCode: "87654321",
          paymentIdempotencyKey: "pay-1",
          transactionPin: "123456",
        },
        context: {
          companyId: ids.companyId,
          membershipId: ids.payAgentMembershipId,
          role: "employee",
        },
        params: { payoutCode: "RAP-260620-ABCD" },
        user: { id: ids.payAgentUserId },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("87654321");
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("pay-1");
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("123456");
    expect(res.locals.audit.metadata).toEqual({
      payoutCode: "RAP-260620-ABCD",
      amount: 25000,
      currency: "FCFA",
      status: "paid",
      assignedAgentGroup: ids.groupId,
      beneficiaryCodeLast4: "4321",
      accountOperation: ids.operationId,
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("87654321");
    expect(JSON.stringify(res.locals.audit)).not.toContain("pay-1");
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });

  it("records a group deposit response with the actual depositing membership in safe audit metadata", async () => {
    const ids = createIds();
    const operation = createAccountOperationRecord(ids);
    jest
      .spyOn(remoteAgentPayoutService, "createRemoteAgentDeposit")
      .mockResolvedValue(operation);
    const res = createResponse();

    await createAgentDeposit(
      createRequest(ids, {
        context: {
          companyId: ids.companyId,
          membershipId: ids.depositorMembershipId,
          role: "employee",
        },
        params: { groupId: ids.groupId.toHexString() },
        user: { id: ids.depositorUserId },
      }),
      res,
    );

    expect(remoteAgentPayoutService.createRemoteAgentDeposit)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        membershipId: ids.depositorMembershipId,
        userId: ids.depositorUserId,
        role: "employee",
        groupId: ids.groupId.toHexString(),
        payload: expect.objectContaining({ transactionPin: "123456" }),
      });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.locals.audit.metadata).toEqual({
      type: "deposit",
      workflow: "remote_agent_payout",
      amount: 25000,
      currency: "FCFA",
      status: "completed",
      linkedRemoteAgentGroup: ids.groupId,
      performedByMembership: ids.depositorMembershipId,
      depositedByMembership: ids.depositorMembershipId,
      previousBalance: 100000,
      currentBalance: 125000,
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });

  it("adds a group member with safe audit metadata", async () => {
    const ids = createIds();
    const group = createGroupRecord(ids);
    jest
      .spyOn(remoteAgentGroupService, "addRemoteAgentGroupMember")
      .mockResolvedValue(group);
    const res = createResponse();

    await addGroupMember(
      createRequest(ids, {
        body: {
          membershipId: ids.payAgentMembershipId.toHexString(),
          permissions: ["remote_payout:view", "remote_payout:pay"],
          transactionPin: "123456",
        },
        params: {
          groupId: ids.groupId.toHexString(),
        },
      }),
      res,
    );

    expect(remoteAgentGroupService.addRemoteAgentGroupMember)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        groupId: ids.groupId.toHexString(),
        membershipId: ids.payAgentMembershipId.toHexString(),
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: expect.objectContaining({ transactionPin: "123456" }),
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.members[0]).toEqual(
      expect.objectContaining({
        agentName: "Moussa Keita",
        agentEmail: "moussa@example.com",
      }),
    );
    expect(res.locals.audit.metadata).toEqual({
      groupId: ids.groupId,
      name: "Agents Bamako",
      actorMembership: ids.managerMembershipId,
      memberMembership: ids.payAgentMembershipId.toHexString(),
      role: undefined,
      permissions: ["remote_payout:view", "remote_payout:pay"],
      status: undefined,
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });

  it("updates a group member with safe audit metadata", async () => {
    const ids = createIds();
    const group = createGroupRecord(ids);
    jest
      .spyOn(remoteAgentGroupService, "updateRemoteAgentGroupMember")
      .mockResolvedValue(group);
    const res = createResponse();

    await updateGroupMember(
      createRequest(ids, {
        body: {
          role: "supervisor",
          permissions: ["remote_payout:view", "remote_payout:deposit"],
          status: "inactive",
          transactionPin: "123456",
        },
        params: {
          groupId: ids.groupId.toHexString(),
          membershipId: ids.payAgentMembershipId.toHexString(),
        },
      }),
      res,
    );

    expect(remoteAgentGroupService.updateRemoteAgentGroupMember)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        groupId: ids.groupId.toHexString(),
        membershipId: ids.payAgentMembershipId.toHexString(),
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: expect.objectContaining({ transactionPin: "123456" }),
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.members[0]).toEqual(
      expect.objectContaining({
        agentName: "Moussa Keita",
        agentEmail: "moussa@example.com",
      }),
    );
    expect(res.locals.audit.metadata).toEqual({
      groupId: ids.groupId,
      name: "Agents Bamako",
      actorMembership: ids.managerMembershipId,
      memberMembership: ids.payAgentMembershipId.toHexString(),
      role: "supervisor",
      permissions: ["remote_payout:view", "remote_payout:deposit"],
      status: "inactive",
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });
});

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    depositorMembershipId: new mongoose.Types.ObjectId(),
    depositorUserId: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    payAgentMembershipId: new mongoose.Types.ObjectId(),
    payAgentUserId: new mongoose.Types.ObjectId(),
    payoutId: new mongoose.Types.ObjectId(),
  };
}

function createGroupRecord({
  companyId,
  groupId,
  payAgentMembershipId,
  payAgentUserId,
}) {
  return {
    _id: groupId,
    company: companyId,
    name: "Agents Bamako",
    currency: "FCFA",
    balance: 100000,
    reservedBalance: 25000,
    status: "active",
    members: [
      {
        membership: {
          _id: payAgentMembershipId,
          user: {
            _id: payAgentUserId,
            name: "Moussa Keita",
            email: "moussa@example.com",
          },
          role: "employee",
          status: "active",
          currency: "FCFA",
        },
        role: "agent",
        permissions: ["remote_payout:view", "remote_payout:pay"],
        status: "active",
      },
    ],
  };
}

function createPayoutRecord(
  { companyId, groupId, managerId, managerMembershipId, payoutId },
  override = {},
) {
  return {
    _id: payoutId,
    company: companyId,
    payoutCode: "RAP-260620-ABCD",
    assignedAgentGroup: groupId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    amount: 25000,
    currency: "FCFA",
    beneficiaryName: "Awa Traore",
    status: "pending",
    beneficiaryCodeHash: "secret-hash",
    beneficiaryCodeLast4: "4321",
    idempotencyKey: "payout-1",
    idempotencyPayload: { amount: 25000 },
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
    ...override,
  };
}

function createAccountOperationRecord({
  companyId,
  depositorMembershipId,
  depositorUserId,
  groupId,
  operationId,
}) {
  return {
    _id: operationId,
    company: companyId,
    targetMembership: depositorMembershipId,
    createdByMembership: depositorMembershipId,
    createdBy: depositorUserId,
    linkedRemoteAgentGroup: groupId,
    performedByMembership: depositorMembershipId,
    depositedByMembership: depositorMembershipId,
    workflow: "remote_agent_payout",
    type: "deposit",
    status: "completed",
    amount: 25000,
    currency: "FCFA",
    previousBalance: 100000,
    currentBalance: 125000,
    operationCode: "AOP-260620-ABCD",
    ledgerEntries: [],
  };
}

function createRequest(
  { companyId, managerId, managerMembershipId },
  override = {},
) {
  return {
    body: {
      amount: 25000,
      transactionPin: "123456",
      idempotencyKey: "payout-1",
    },
    context: {
      companyId,
      membershipId: managerMembershipId,
      role: "manager",
    },
    params: {},
    user: {
      id: managerId,
    },
    ...override,
  };
}

function createResponse() {
  return {
    locals: {},
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
}
