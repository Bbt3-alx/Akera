import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import Company from "../../models/Company.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import RemoteAgentGroup from "../../models/RemoteAgentGroup.js";
import RemoteAgentPayout from "../../models/RemoteAgentPayout.js";
import {
  addRemoteAgentGroupMember,
  createRemoteAgentGroup,
  getRemoteAgentGroup,
  listRemoteAgentGroups,
  updateRemoteAgentGroup,
  updateRemoteAgentGroupMember,
} from "../../services/remoteAgentGroup.service.js";

describe("remote agent group service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects non-manager group management access", async () => {
    const ids = createIds();

    await expect(
      listRemoteAgentGroups({
        companyId: ids.companyId,
        role: "employee",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "REMOTE_AGENT_GROUP_MANAGER_REQUIRED",
    });
  });

  it("lists manager-scoped company groups with filters and pagination", async () => {
    const ids = createIds();
    const groups = [createPopulatedGroup(ids)];
    const query = createFindQuery(groups);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);
    jest.spyOn(RemoteAgentGroup, "countDocuments").mockResolvedValue(1);

    const result = await listRemoteAgentGroups({
      companyId: ids.companyId,
      role: "manager",
      filters: { search: "Bamako", status: "active" },
      pagination: { page: 2, limit: 10 },
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith({
      company: ids.companyId,
      name: /Bamako/i,
      status: "active",
    });
    expect(query.populate).toHaveBeenCalledWith(expectedMemberPopulate());
    expect(result.groups[0].members[0].membership.user.name).toBe(
      "Moussa Keita",
    );
    expect(result).toEqual({
      groups,
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it("gets a group only when it belongs to the company", async () => {
    const ids = createIds();
    const group = createPopulatedGroup(ids);
    const query = createLeanQuery(group);
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(query);

    await expect(
      getRemoteAgentGroup({
        companyId: ids.companyId,
        groupId: ids.groupId.toString(),
        role: "manager",
      }),
    ).resolves.toBe(group);
    expect(RemoteAgentGroup.findOne).toHaveBeenCalledWith({
      _id: ids.groupId,
      company: ids.companyId,
    });
    expect(query.populate).toHaveBeenCalledWith(expectedMemberPopulate());
    expect(group.members[0].membership.user.name).toBe("Moussa Keita");
  });

  it("creates an empty active FCFA group without mutating company balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const group = createGroup(ids, { members: [] });
    const responseGroup = createPopulatedGroup(ids, { members: [] });
    jest.spyOn(RemoteAgentGroup, "create").mockResolvedValue([group]);
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createResponseGroupQuery(responseGroup),
    );
    const companyUpdate = jest.spyOn(Company, "updateOne");
    const companyFindOneAndUpdate = jest.spyOn(Company, "findOneAndUpdate");

    const result = await createRemoteAgentGroup({
      companyId: ids.companyId,
      managerId: ids.managerId,
      managerMembershipId: ids.managerMembershipId,
      role: "manager",
      payload: { name: " Agents Bamako ", transactionPin: "123456" },
    });

    expect(result).toBe(responseGroup);
    expect(RemoteAgentGroup.create).toHaveBeenCalledWith(
      [
        {
          company: ids.companyId,
          name: "Agents Bamako",
          currency: "FCFA",
          balance: 0,
          reservedBalance: 0,
          status: "active",
          members: [],
        },
      ],
      { session: expect.any(Object) },
    );
    expect(companyUpdate).not.toHaveBeenCalled();
    expect(companyFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("creates a group with valid active FCFA employee members and deduplicates them", async () => {
    mockMongooseSession();
    const ids = createIds();
    const responseGroup = createPopulatedGroup(ids);
    jest.spyOn(CompanyMembership, "find").mockReturnValue(
      createSessionLeanQuery([
        createMembership(ids, { _id: ids.employeeMembershipId }),
      ]),
    );
    jest.spyOn(RemoteAgentGroup, "create").mockResolvedValue([createGroup(ids)]);
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createResponseGroupQuery(responseGroup),
    );

    const result = await createRemoteAgentGroup({
      companyId: ids.companyId,
      managerId: ids.managerId,
      managerMembershipId: ids.managerMembershipId,
      role: "manager",
      payload: {
        name: "Agents Bamako",
        transactionPin: "123456",
        members: [
          {
            membershipId: ids.employeeMembershipId.toString(),
            role: "supervisor",
            permissions: [
              "remote_payout:view",
              "remote_payout:deposit",
              "remote_payout:pay",
            ],
          },
          {
            membershipId: ids.employeeMembershipId.toString(),
            permissions: ["remote_payout:view"],
          },
        ],
      },
    });

    expect(result.members[0].membership.user.name).toBe("Moussa Keita");
    expect(CompanyMembership.find).toHaveBeenCalledWith({
      _id: { $in: [ids.employeeMembershipId] },
      company: ids.companyId,
    });
    expect(RemoteAgentGroup.create.mock.calls[0][0][0].members).toEqual([
      {
        membership: ids.employeeMembershipId,
        role: "supervisor",
        permissions: [
          "remote_payout:view",
          "remote_payout:deposit",
          "remote_payout:pay",
        ],
        status: "active",
        joinedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    ]);
  });

  it.each([
    ["manager", { role: "manager" }, "REMOTE_AGENT_GROUP_EMPLOYEE_REQUIRED"],
    ["other company", { company: new mongoose.Types.ObjectId() }, "REMOTE_AGENT_GROUP_MEMBER_NOT_FOUND"],
    ["non-FCFA employee", { currency: "GNF" }, "REMOTE_AGENT_GROUP_MEMBER_FCFA_REQUIRED"],
  ])("rejects %s initial members", async (_label, override, errorCode) => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(CompanyMembership, "find").mockReturnValue(
      createSessionLeanQuery([
        createMembership(ids, { _id: ids.employeeMembershipId, ...override }),
      ]),
    );
    const groupCreate = jest.spyOn(RemoteAgentGroup, "create");

    await expect(
      createRemoteAgentGroup({
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: {
          name: "Agents Bamako",
          transactionPin: "123456",
          members: [{ membershipId: ids.employeeMembershipId.toString() }],
        },
      }),
    ).rejects.toMatchObject({ errorCode });
    expect(groupCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid group member permissions", async () => {
    const ids = createIds();

    await expect(
      createRemoteAgentGroup({
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: {
          name: "Agents Bamako",
          transactionPin: "123456",
          members: [
            {
              membershipId: ids.employeeMembershipId.toString(),
              permissions: ["remote_payout:fly"],
            },
          ],
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_REMOTE_AGENT_GROUP_PERMISSION",
    });
  });

  it("renames a group and deactivates only when no reserved funds or pending payouts exist", async () => {
    mockMongooseSession();
    const ids = createIds();
    const group = createGroup(ids, {
      save: jest.fn().mockResolvedValue(undefined),
    });
    const responseGroup = createPopulatedGroup(ids, {
      name: "Bamako Nord",
      status: "inactive",
    });
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(group),
    ).mockReturnValueOnce(
      createSessionQuery(group),
    ).mockReturnValueOnce(
      createResponseGroupQuery(responseGroup),
    );
    jest.spyOn(RemoteAgentPayout, "countDocuments").mockReturnValue(
      createSessionCountQuery(0),
    );

    const result = await updateRemoteAgentGroup({
      companyId: ids.companyId,
      groupId: ids.groupId.toString(),
      managerId: ids.managerId,
      managerMembershipId: ids.managerMembershipId,
      role: "manager",
      payload: {
        name: " Bamako Nord ",
        status: "inactive",
        transactionPin: "123456",
      },
    });

    expect(result.name).toBe("Bamako Nord");
    expect(result.status).toBe("inactive");
    expect(group.save).toHaveBeenCalledWith({ session: expect.any(Object) });
  });

  it("blocks deactivation with reserved balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(createGroup(ids, { reservedBalance: 25000 })),
    );

    await expect(
      updateRemoteAgentGroup({
        companyId: ids.companyId,
        groupId: ids.groupId.toString(),
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: { status: "inactive", transactionPin: "123456" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "GROUP_HAS_RESERVED_BALANCE",
    });
  });

  it("blocks deactivation with pending payouts", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(createGroup(ids, { reservedBalance: 0 })),
    );
    jest.spyOn(RemoteAgentPayout, "countDocuments").mockReturnValue(
      createSessionCountQuery(1),
    );

    await expect(
      updateRemoteAgentGroup({
        companyId: ids.companyId,
        groupId: ids.groupId.toString(),
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: { status: "inactive", transactionPin: "123456" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "GROUP_HAS_PENDING_PAYOUTS",
    });
  });

  it("adds an active FCFA employee as a group member", async () => {
    mockMongooseSession();
    const ids = createIds();
    const group = createGroup(ids, {
      members: [],
      save: jest.fn().mockResolvedValue(undefined),
    });
    const responseGroup = createPopulatedGroup(ids);
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(group),
    ).mockReturnValueOnce(
      createSessionQuery(group),
    ).mockReturnValueOnce(
      createResponseGroupQuery(responseGroup),
    );
    jest.spyOn(CompanyMembership, "findOne").mockReturnValue(
      createSessionLeanQuery(createMembership(ids)),
    );

    const result = await addRemoteAgentGroupMember({
      companyId: ids.companyId,
      groupId: ids.groupId.toString(),
      membershipId: ids.employeeMembershipId.toString(),
      managerId: ids.managerId,
      managerMembershipId: ids.managerMembershipId,
      role: "manager",
      payload: {
        permissions: ["remote_payout:view", "remote_payout:pay"],
        transactionPin: "123456",
      },
    });

    expect(result).toBe(responseGroup);
    expect(result.members[0].membership.user.name).toBe("Moussa Keita");
    expect(group.members).toEqual([
      expect.objectContaining({
        membership: ids.employeeMembershipId,
        role: "agent",
        permissions: ["remote_payout:view", "remote_payout:pay"],
        status: "active",
      }),
    ]);
    expect(group.save).toHaveBeenCalledWith({ session: expect.any(Object) });
  });

  it("reactivates an inactive existing member and rejects active duplicates", async () => {
    mockMongooseSession();
    const ids = createIds();
    const inactiveGroup = createGroup(ids, {
      members: [
        {
          membership: ids.employeeMembershipId,
          role: "agent",
          permissions: ["remote_payout:view"],
          status: "inactive",
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest.spyOn(RemoteAgentGroup, "findOne")
      .mockReturnValueOnce(createSessionQuery(inactiveGroup))
      .mockReturnValueOnce(createResponseGroupQuery(createPopulatedGroup(ids)))
      .mockReturnValueOnce(createSessionQuery(createGroup(ids, {
        members: [
          {
            membership: ids.employeeMembershipId,
            role: "agent",
            permissions: ["remote_payout:view"],
            status: "active",
          },
        ],
      })));
    jest.spyOn(CompanyMembership, "findOne").mockReturnValue(
      createSessionLeanQuery(createMembership(ids)),
    );

    await addRemoteAgentGroupMember({
      companyId: ids.companyId,
      groupId: ids.groupId.toString(),
      membershipId: ids.employeeMembershipId.toString(),
      managerId: ids.managerId,
      managerMembershipId: ids.managerMembershipId,
      role: "manager",
      payload: {
        role: "supervisor",
        permissions: ["remote_payout:view", "remote_payout:deposit"],
        transactionPin: "123456",
      },
    });

    expect(inactiveGroup.members[0]).toEqual(expect.objectContaining({
      role: "supervisor",
      permissions: ["remote_payout:view", "remote_payout:deposit"],
      status: "active",
    }));
    await expect(
      addRemoteAgentGroupMember({
        companyId: ids.companyId,
        groupId: ids.groupId.toString(),
        membershipId: ids.employeeMembershipId.toString(),
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: { transactionPin: "123456" },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "MEMBER_ALREADY_IN_GROUP",
    });
  });

  it("updates member role, permissions, and status", async () => {
    mockMongooseSession();
    const ids = createIds();
    const group = createGroup(ids, {
      members: [
        {
          membership: ids.employeeMembershipId,
          role: "agent",
          permissions: ["remote_payout:view"],
          status: "active",
        },
        {
          membership: ids.secondEmployeeMembershipId,
          role: "agent",
          permissions: ["remote_payout:view", "remote_payout:pay"],
          status: "active",
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    });
    const responseGroup = createPopulatedGroup(ids);
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(group),
    ).mockReturnValueOnce(
      createSessionQuery(group),
    ).mockReturnValueOnce(
      createResponseGroupQuery(responseGroup),
    );

    const result = await updateRemoteAgentGroupMember({
      companyId: ids.companyId,
      groupId: ids.groupId.toString(),
      membershipId: ids.employeeMembershipId.toString(),
      managerId: ids.managerId,
      managerMembershipId: ids.managerMembershipId,
      role: "manager",
      payload: {
        role: "supervisor",
        permissions: ["remote_payout:view", "remote_payout:deposit"],
        status: "inactive",
        transactionPin: "123456",
      },
    });

    expect(result.members[0].membership.user.name).toBe("Moussa Keita");
    expect(group.members[0]).toEqual(expect.objectContaining({
      role: "supervisor",
      permissions: ["remote_payout:view", "remote_payout:deposit"],
      status: "inactive",
    }));
    expect(group.save).toHaveBeenCalledWith({ session: expect.any(Object) });
  });

  it("does not inactivate the last active pay-enabled member while payouts are pending", async () => {
    mockMongooseSession();
    const ids = createIds();
    const group = createGroup(ids, {
      members: [
        {
          membership: ids.employeeMembershipId,
          role: "agent",
          permissions: ["remote_payout:view", "remote_payout:pay"],
          status: "active",
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(group),
    );
    jest.spyOn(RemoteAgentPayout, "countDocuments").mockReturnValue(
      createSessionCountQuery(1),
    );

    await expect(
      updateRemoteAgentGroupMember({
        companyId: ids.companyId,
        groupId: ids.groupId.toString(),
        membershipId: ids.employeeMembershipId.toString(),
        managerId: ids.managerId,
        managerMembershipId: ids.managerMembershipId,
        role: "manager",
        payload: { status: "inactive", transactionPin: "123456" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "GROUP_PENDING_PAYOUTS_REQUIRE_PAY_AGENT",
    });
  });
});

function mockMongooseSession() {
  const session = {
    endSession: jest.fn().mockResolvedValue(undefined),
    withTransaction: jest.fn(async (work) => {
      await work();
    }),
  };

  jest.spyOn(mongoose, "startSession").mockResolvedValue(session);

  return session;
}

function createFindQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createLeanQuery(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createSessionQuery(result) {
  return {
    session: jest.fn().mockResolvedValue(result),
  };
}

function createSessionLeanQuery(result) {
  return {
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createSessionCountQuery(result) {
  return {
    session: jest.fn().mockResolvedValue(result),
  };
}

function createResponseGroupQuery(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function expectedMemberPopulate() {
  return {
    path: "members.membership",
    select: "user role status currency",
    populate: {
      path: "user",
      select: "name email",
    },
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    employeeMembershipId: new mongoose.Types.ObjectId(),
    employeeUserId: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    secondEmployeeMembershipId: new mongoose.Types.ObjectId(),
  };
}

function createMembership(
  { companyId, employeeMembershipId, employeeUserId },
  override = {},
) {
  return {
    _id: employeeMembershipId,
    company: companyId,
    user: employeeUserId,
    role: "employee",
    status: "active",
    currency: "FCFA",
    ...override,
  };
}

function createGroup(
  { companyId, employeeMembershipId, groupId },
  override = {},
) {
  return {
    _id: groupId,
    company: companyId,
    name: "Agents Bamako",
    currency: "FCFA",
    balance: 100000,
    reservedBalance: 0,
    status: "active",
    members: [
      {
        membership: employeeMembershipId,
        role: "agent",
        permissions: ["remote_payout:view", "remote_payout:pay"],
        status: "active",
      },
    ],
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function createPopulatedGroup(
  { companyId, employeeMembershipId, employeeUserId, groupId },
  override = {},
) {
  return createGroup(
    { companyId, employeeMembershipId, groupId },
    {
      members: [
        {
          membership: {
            _id: employeeMembershipId,
            user: {
              _id: employeeUserId,
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
      ...override,
    },
  );
}
