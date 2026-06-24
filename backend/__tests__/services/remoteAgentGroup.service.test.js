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
  listEligibleRemoteAgents,
  listMyRemoteAgentGroups,
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
    expect(result.groups[0].members[0].membership.user).toEqual(
      expect.objectContaining({
        firstName: "Moussa",
        lastName: "Keita",
        email: "moussa@example.com",
      }),
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

  it("lists manager-scoped company groups without a status filter", async () => {
    const ids = createIds();
    const groups = [
      createPopulatedGroup(ids),
      createPopulatedGroup(ids, {
        _id: new mongoose.Types.ObjectId(),
        name: "Agents Kayes",
        status: "inactive",
      }),
    ];
    const query = createFindQuery(groups);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);
    jest.spyOn(RemoteAgentGroup, "countDocuments").mockResolvedValue(2);

    const result = await listRemoteAgentGroups({
      companyId: ids.companyId,
      role: "manager",
      filters: {},
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith({
      company: ids.companyId,
    });
    expect(result.groups).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it.each([
    ["active", "active"],
    ["inactive", "inactive"],
  ])("filters manager-scoped groups by %s status", async (_label, status) => {
    const ids = createIds();
    const groups = [createPopulatedGroup(ids, { status })];
    const query = createFindQuery(groups);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);
    jest.spyOn(RemoteAgentGroup, "countDocuments").mockResolvedValue(1);

    const result = await listRemoteAgentGroups({
      companyId: ids.companyId,
      role: "manager",
      filters: { status },
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith({
      company: ids.companyId,
      status,
    });
    expect(result.groups).toEqual(groups);
  });

  it("rejects invalid group list status filters", async () => {
    const ids = createIds();

    await expect(
      listRemoteAgentGroups({
        companyId: ids.companyId,
        role: "manager",
        filters: { status: "archived" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_REMOTE_AGENT_GROUP_STATUS",
    });
  });

  it("treats blank group list status filters like no status filter", async () => {
    const ids = createIds();
    const groups = [createPopulatedGroup(ids)];
    const query = createFindQuery(groups);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);
    jest.spyOn(RemoteAgentGroup, "countDocuments").mockResolvedValue(1);

    await listRemoteAgentGroups({
      companyId: ids.companyId,
      role: "manager",
      filters: { status: " " },
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith({
      company: ids.companyId,
    });
  });

  it("lists only active employee member groups for the active company", async () => {
    const ids = createIds();
    const groups = [createPopulatedGroup(ids)];
    const query = createSimpleFindQuery(groups);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);

    const result = await listMyRemoteAgentGroups({
      companyId: ids.companyId,
      membershipId: ids.employeeMembershipId,
      role: "employee",
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith({
      company: ids.companyId,
      status: "active",
      members: {
        $elemMatch: {
          membership: ids.employeeMembershipId,
          status: "active",
        },
      },
    });
    expect(query.populate).toHaveBeenCalledWith(expectedMemberPopulate());
    expect(result).toEqual([
      expect.objectContaining({
        currentMemberRole: "agent",
        currentMemberPermissions: ["remote_payout:view", "remote_payout:pay"],
      }),
    ]);
  });

  it("excludes groups where the employee is not an active member", async () => {
    const ids = createIds();
    const query = createSimpleFindQuery([]);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);

    const result = await listMyRemoteAgentGroups({
      companyId: ids.companyId,
      membershipId: ids.employeeMembershipId,
      role: "employee",
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        members: {
          $elemMatch: {
            membership: ids.employeeMembershipId,
            status: "active",
          },
        },
      }),
    );
    expect(result).toEqual([]);
  });

  it("scopes employee my-groups to their active company", async () => {
    const ids = createIds();
    const query = createSimpleFindQuery([]);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);

    await listMyRemoteAgentGroups({
      companyId: ids.otherCompanyId,
      membershipId: ids.employeeMembershipId,
      role: "employee",
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith(
      expect.objectContaining({
        company: ids.otherCompanyId,
      }),
    );
  });

  it("lists active company groups for managers through my-groups", async () => {
    const ids = createIds();
    const groups = [createPopulatedGroup(ids)];
    const query = createSimpleFindQuery(groups);
    jest.spyOn(RemoteAgentGroup, "find").mockReturnValue(query);

    const result = await listMyRemoteAgentGroups({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
    });

    expect(RemoteAgentGroup.find).toHaveBeenCalledWith({
      company: ids.companyId,
      status: "active",
    });
    expect(result).toEqual(groups);
  });

  it("rejects my-groups access for unsupported roles", async () => {
    const ids = createIds();

    await expect(
      listMyRemoteAgentGroups({
        companyId: ids.companyId,
        membershipId: ids.employeeMembershipId,
        role: "owner",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "REMOTE_AGENT_GROUP_ACCESS_DENIED",
    });
  });

  it("lists eligible active FCFA employee agents with safe identity fields", async () => {
    const ids = createIds();
    const memberships = [
      createEligibleMembership(ids, {
        user: {
          _id: ids.employeeUserId,
          name: "Awa Traore",
          firstName: "Awa",
          lastName: "Traore",
          email: "awa@example.com",
          password: "secret-password",
          transactionPinHash: "secret-pin-hash",
        },
      }),
    ];
    const query = createPopulateLeanQuery(memberships);
    jest.spyOn(CompanyMembership, "find").mockReturnValue(query);

    const result = await listEligibleRemoteAgents({
      companyId: ids.companyId,
      role: "manager",
      limit: "20",
    });

    expect(CompanyMembership.find).toHaveBeenCalledWith({
      company: ids.companyId,
      role: "employee",
      status: "active",
      currency: "FCFA",
    });
    expect(query.populate).toHaveBeenCalledWith({
      path: "user",
      select: "name firstName lastName email",
    });
    expect(result).toEqual([
      {
        membershipId: ids.employeeMembershipId.toHexString(),
        userId: ids.employeeUserId.toHexString(),
        name: "Awa Traore",
        email: "awa@example.com",
        role: "employee",
        status: "active",
        currency: "FCFA",
        isAlreadyInGroup: false,
        groupMemberStatus: null,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("secret-password");
    expect(JSON.stringify(result)).not.toContain("secret-pin-hash");
  });

  it("rejects non-manager eligible agent listing", async () => {
    const ids = createIds();

    await expect(
      listEligibleRemoteAgents({
        companyId: ids.companyId,
        role: "employee",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "REMOTE_AGENT_GROUP_MANAGER_REQUIRED",
    });
  });

  it("searches eligible agents by populated name or email and caps limit at 50", async () => {
    const ids = createIds();
    const memberships = [
      createEligibleMembership(ids, {
        _id: ids.employeeMembershipId,
        user: {
          _id: ids.employeeUserId,
          firstName: "Awa",
          lastName: "Traore",
          email: "awa@example.com",
        },
      }),
      createEligibleMembership(ids, {
        _id: ids.secondEmployeeMembershipId,
        user: {
          _id: ids.secondEmployeeUserId,
          firstName: "Moussa",
          lastName: "Keita",
          email: "moussa@example.com",
        },
      }),
    ];
    jest.spyOn(CompanyMembership, "find").mockReturnValue(
      createPopulateLeanQuery(memberships),
    );

    const result = await listEligibleRemoteAgents({
      companyId: ids.companyId,
      role: "manager",
      search: "moussa",
      limit: "100",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        membershipId: ids.secondEmployeeMembershipId.toHexString(),
        name: "Moussa Keita",
        email: "moussa@example.com",
      }),
    );
  });

  it("uses default eligible agent limit of 20", async () => {
    const ids = createIds();
    const memberships = Array.from({ length: 25 }, (_value, index) =>
      createEligibleMembership(ids, {
        _id: new mongoose.Types.ObjectId(),
        user: {
          _id: new mongoose.Types.ObjectId(),
          firstName: "Agent",
          lastName: `${String(index).padStart(2, "0")}`,
          email: `agent${index}@example.com`,
        },
      }),
    );
    jest.spyOn(CompanyMembership, "find").mockReturnValue(
      createPopulateLeanQuery(memberships),
    );

    const result = await listEligibleRemoteAgents({
      companyId: ids.companyId,
      role: "manager",
    });

    expect(result).toHaveLength(20);
  });

  it("annotates eligible agents with active and inactive group member status", async () => {
    const ids = createIds();
    const inactiveMembershipId = new mongoose.Types.ObjectId();
    const inactiveUserId = new mongoose.Types.ObjectId();
    const memberships = [
      createEligibleMembership(ids, {
        _id: ids.employeeMembershipId,
        user: {
          _id: ids.employeeUserId,
          firstName: "Awa",
          lastName: "Traore",
          email: "awa@example.com",
        },
      }),
      createEligibleMembership(ids, {
        _id: inactiveMembershipId,
        user: {
          _id: inactiveUserId,
          firstName: "Mariama",
          lastName: "Diallo",
          email: "mariama@example.com",
        },
      }),
    ];
    jest.spyOn(CompanyMembership, "find").mockReturnValue(
      createPopulateLeanQuery(memberships),
    );
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createLeanQuery(createGroup(ids, {
        members: [
          {
            membership: ids.employeeMembershipId,
            role: "agent",
            permissions: ["remote_payout:view"],
            status: "active",
          },
          {
            membership: inactiveMembershipId,
            role: "agent",
            permissions: ["remote_payout:view"],
            status: "inactive",
          },
        ],
      })),
    );

    const result = await listEligibleRemoteAgents({
      companyId: ids.companyId,
      role: "manager",
      groupId: ids.groupId.toHexString(),
    });

    expect(RemoteAgentGroup.findOne).toHaveBeenCalledWith({
      _id: ids.groupId,
      company: ids.companyId,
    });
    expect(result).toEqual([
      expect.objectContaining({
        membershipId: ids.employeeMembershipId.toHexString(),
        isAlreadyInGroup: true,
        groupMemberStatus: "active",
      }),
      expect.objectContaining({
        membershipId: inactiveMembershipId.toHexString(),
        isAlreadyInGroup: false,
        groupMemberStatus: "inactive",
      }),
    ]);
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
    expect(group.members[0].membership.user).toEqual(
      expect.objectContaining({
        firstName: "Moussa",
        lastName: "Keita",
        email: "moussa@example.com",
      }),
    );
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

    expect(result.members[0].membership.user).toEqual(
      expect.objectContaining({
        firstName: "Moussa",
        lastName: "Keita",
        email: "moussa@example.com",
      }),
    );
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
    expect(result.members[0].membership.user).toEqual(
      expect.objectContaining({
        firstName: "Moussa",
        lastName: "Keita",
        email: "moussa@example.com",
      }),
    );
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

    expect(result.members[0].membership.user).toEqual(
      expect.objectContaining({
        firstName: "Moussa",
        lastName: "Keita",
        email: "moussa@example.com",
      }),
    );
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

function createSimpleFindQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createPopulateLeanQuery(result) {
  return {
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
      select: "name firstName lastName email",
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
    otherCompanyId: new mongoose.Types.ObjectId(),
    secondEmployeeMembershipId: new mongoose.Types.ObjectId(),
    secondEmployeeUserId: new mongoose.Types.ObjectId(),
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

function createEligibleMembership(
  { companyId, employeeMembershipId, employeeUserId },
  override = {},
) {
  return {
    _id: employeeMembershipId,
    company: companyId,
    user: {
      _id: employeeUserId,
      firstName: "Awa",
      lastName: "Traore",
      email: "awa@example.com",
    },
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
              firstName: "Moussa",
              lastName: "Keita",
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
