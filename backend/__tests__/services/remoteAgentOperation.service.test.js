import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import AccountOperation from "../../models/AccountOperation.js";
import RemoteAgentGroup from "../../models/RemoteAgentGroup.js";
import RemoteAgentPayout from "../../models/RemoteAgentPayout.js";
import { listRemoteAgentOperations } from "../../services/remoteAgentOperation.service.js";

describe("remote agent operation service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps deposits and payout lifecycle events to safe actor-based rows", async () => {
    const ids = createIds();
    const group = createGroup(ids);
    const deposit = createDepositOperation(ids, {
      depositedByMembership: createMembershipActor({
        membershipId: ids.depositActorMembershipId,
        userId: ids.depositActorUserId,
        firstName: "Awa",
        lastName: "Traore",
        email: "awa@example.com",
        role: "employee",
      }),
      performedByMembership: createMembershipActor({
        membershipId: ids.otherActorMembershipId,
        userId: ids.otherActorUserId,
        firstName: "Other",
        lastName: "Agent",
        email: "other@example.com",
        role: "employee",
      }),
    });
    const createdPayout = createPayout(ids, {
      payoutCode: "RAP-CREATED",
      status: "pending",
    });
    const paidPayout = createPayout(ids, {
      _id: ids.paidPayoutId,
      payoutCode: "RAP-PAID",
      status: "paid",
      paidAt: new Date("2026-06-24T10:00:00.000Z"),
      paidByMembership: createMembershipActor({
        membershipId: ids.payActorMembershipId,
        userId: ids.payActorUserId,
        firstName: "Moussa",
        lastName: "Keita",
        email: "moussa@example.com",
        role: "employee",
      }),
    });
    const canceledPayout = createPayout(ids, {
      _id: ids.canceledPayoutId,
      payoutCode: "RAP-CANCELED",
      status: "canceled",
      canceledAt: new Date("2026-06-24T11:00:00.000Z"),
      canceledByMembership: createMembershipActor({
        membershipId: ids.managerMembershipId,
        userId: ids.managerUserId,
        firstName: "Manager",
        lastName: "One",
        email: "manager@example.com",
        role: "manager",
      }),
    });

    jest.spyOn(RemoteAgentGroup, "find").mockReturnValueOnce(
      createFindQuery([group]),
    );
    jest.spyOn(AccountOperation, "find").mockReturnValueOnce(
      createFindQuery([deposit]),
    );
    jest.spyOn(RemoteAgentPayout, "find").mockReturnValueOnce(
      createFindQuery([createdPayout, paidPayout, canceledPayout]),
    );

    const result = await listRemoteAgentOperations({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      query: { limit: 20 },
    });

    expect(result.pagination.total).toBe(6);
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "remote_agent_deposit",
          reference: "DEP-1",
          groupName: "Agents Bamako",
          actorName: "Awa Traore",
          actorEmail: "awa@example.com",
          beneficiaryName: null,
          amount: 25000,
          currency: "FCFA",
          status: "completed",
        }),
        expect.objectContaining({
          type: "remote_payout_created",
          reference: "RAP-CREATED",
          actorName: "Manager One",
          beneficiaryName: "Fatou Camara",
          status: "pending",
        }),
        expect.objectContaining({
          type: "remote_payout_paid",
          reference: "RAP-PAID",
          actorName: "Moussa Keita",
          actor: expect.objectContaining({
            membershipId: ids.payActorMembershipId.toHexString(),
            role: "employee",
          }),
          status: "paid",
        }),
        expect.objectContaining({
          type: "remote_payout_canceled",
          reference: "RAP-CANCELED",
          actorName: "Manager One",
          status: "canceled",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("beneficiaryCodeHash");
    expect(JSON.stringify(result)).not.toContain("secret-hash");
    expect(JSON.stringify(result)).not.toContain("idempotencyKey");
    expect(JSON.stringify(result)).not.toContain("payment-key");
    expect(JSON.stringify(result)).not.toContain("transactionPin");
  });

  it("lets employees see operations by other actors in active groups where they can view", async () => {
    const ids = createIds();
    const authorizedGroup = createGroup(ids);
    const otherActorDeposit = createDepositOperation(ids, {
      depositedByMembership: createMembershipActor({
        membershipId: ids.otherActorMembershipId,
        userId: ids.otherActorUserId,
        firstName: "Other",
        lastName: "Agent",
        email: "other@example.com",
        role: "employee",
      }),
    });

    const groupFind = jest.spyOn(RemoteAgentGroup, "find").mockReturnValueOnce(
      createFindQuery([authorizedGroup]),
    );
    const operationFind = jest.spyOn(AccountOperation, "find").mockReturnValueOnce(
      createFindQuery([otherActorDeposit]),
    );
    const payoutFind = jest.spyOn(RemoteAgentPayout, "find").mockReturnValueOnce(
      createFindQuery([]),
    );

    const result = await listRemoteAgentOperations({
      companyId: ids.companyId,
      membershipId: ids.viewerMembershipId,
      role: "employee",
      query: {},
    });

    expect(groupFind).toHaveBeenCalledWith({
      company: ids.companyId,
      status: "active",
      members: {
        $elemMatch: {
          membership: ids.viewerMembershipId,
          status: "active",
          permissions: "remote_payout:view",
        },
      },
    });
    expect(operationFind.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        company: ids.companyId,
        workflow: "remote_agent_payout",
        type: "deposit",
        linkedRemoteAgentGroup: { $in: [ids.groupId] },
      }),
    );
    expect(payoutFind.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        company: ids.companyId,
        assignedAgentGroup: { $in: [ids.groupId] },
      }),
    );
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual(
      expect.objectContaining({
        type: "remote_agent_deposit",
        actorName: "Other Agent",
      }),
    );
  });

  it("returns no employee operations when no active view-enabled group matches", async () => {
    const ids = createIds();
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValueOnce(createFindQuery([]));
    const operationFind = jest.spyOn(AccountOperation, "find");
    const payoutFind = jest.spyOn(RemoteAgentPayout, "find");

    const result = await listRemoteAgentOperations({
      companyId: ids.companyId,
      membershipId: ids.viewerMembershipId,
      role: "employee",
      query: {},
    });

    expect(result).toEqual({
      operations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
    expect(operationFind).not.toHaveBeenCalled();
    expect(payoutFind).not.toHaveBeenCalled();
  });
});

function createFindQuery(result) {
  return {
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
}

function createIds() {
  return {
    canceledPayoutId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    depositActorMembershipId: new mongoose.Types.ObjectId(),
    depositActorUserId: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    managerUserId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    otherActorMembershipId: new mongoose.Types.ObjectId(),
    otherActorUserId: new mongoose.Types.ObjectId(),
    paidPayoutId: new mongoose.Types.ObjectId(),
    payActorMembershipId: new mongoose.Types.ObjectId(),
    payActorUserId: new mongoose.Types.ObjectId(),
    payoutId: new mongoose.Types.ObjectId(),
    viewerMembershipId: new mongoose.Types.ObjectId(),
  };
}

function createGroup({ companyId, groupId, viewerMembershipId }) {
  return {
    _id: groupId,
    company: companyId,
    name: "Agents Bamako",
    status: "active",
    members: [
      {
        membership: viewerMembershipId,
        status: "active",
        permissions: ["remote_payout:view"],
      },
    ],
  };
}

function createMembershipActor({
  email,
  firstName,
  lastName,
  membershipId,
  role,
  userId,
}) {
  return {
    _id: membershipId,
    role,
    user: {
      _id: userId,
      firstName,
      lastName,
      email,
      password: "secret-password",
      transactionPinHash: "secret-pin",
    },
  };
}

function createDepositOperation(
  { companyId, groupId, operationId },
  override = {},
) {
  return {
    _id: operationId,
    company: companyId,
    linkedRemoteAgentGroup: groupId,
    workflow: "remote_agent_payout",
    type: "deposit",
    status: "completed",
    amount: 25000,
    currency: "FCFA",
    operationCode: "AOP-260624-ABCD",
    reference: "DEP-1",
    beneficiaryCodeHash: "secret-hash",
    idempotencyKey: "secret-idempotency",
    transactionPin: "123456",
    createdAt: new Date("2026-06-24T09:00:00.000Z"),
    ...override,
  };
}

function createPayout(
  { companyId, groupId, managerMembershipId, managerUserId, payoutId },
  override = {},
) {
  return {
    _id: payoutId,
    company: companyId,
    payoutCode: "RAP-260624-ABCD",
    assignedAgentGroup: groupId,
    createdByMembership: createMembershipActor({
      membershipId: managerMembershipId,
      userId: managerUserId,
      firstName: "Manager",
      lastName: "One",
      email: "manager@example.com",
      role: "manager",
    }),
    createdBy: {
      _id: managerUserId,
      firstName: "Manager",
      lastName: "One",
      email: "manager@example.com",
    },
    amount: 25000,
    currency: "FCFA",
    beneficiaryName: "Fatou Camara",
    status: "pending",
    beneficiaryCodeHash: "secret-hash",
    beneficiaryCodeLast4: "1234",
    idempotencyKey: "secret-idempotency",
    paymentIdempotencyKey: "payment-key",
    createdAt: new Date("2026-06-24T09:30:00.000Z"),
    ...override,
  };
}
