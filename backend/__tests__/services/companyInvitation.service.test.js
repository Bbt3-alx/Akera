import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import Company from "../../models/Company.js";
import CompanyInvitation from "../../models/CompanyInvitation.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import User from "../../models/User.js";
import {
  acceptCompanyInvitation,
  createCompanyInvitation,
  listCompanyInvitations,
  listMyInvitations,
  rejectCompanyInvitation,
  revokeCompanyInvitation,
} from "../../services/companyInvitation.service.js";

describe("company invitation service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lets a manager invite a partner with currency and startingBalance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const company = createCompany(ids);
    const invitation = createInvitation({
      ...ids,
      email: "partner@example.com",
      role: "partner",
      currency: "GNF",
      startingBalance: 2500,
    });
    jest.spyOn(Company, "findById").mockReturnValue(createSessionQuery(company));
    jest.spyOn(User, "findOne").mockReturnValue(createSessionQuery(null));
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(null));
    const invitationCreate = jest
      .spyOn(CompanyInvitation, "create")
      .mockResolvedValue([invitation]);

    const result = await createCompanyInvitation({
      companyId: ids.companyId,
      managerId: ids.managerId,
      managerRole: "manager",
      payload: {
        email: " PARTNER@EXAMPLE.COM ",
        role: "partner",
        currency: "GNF",
        startingBalance: 2500,
      },
    });

    expect(result).toBe(invitation);
    expect(invitationCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          email: "partner@example.com",
          company: ids.companyId,
          role: "partner",
          currency: "GNF",
          startingBalance: 2500,
          invitedBy: ids.managerId,
        }),
      ],
      { session: expect.any(Object) },
    );
  });

  it("lets a manager invite an employee with the company base currency and zero balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const company = createCompany({ ...ids, baseCurrency: "GNF" });
    const invitation = createInvitation({
      ...ids,
      role: "employee",
      currency: "GNF",
      startingBalance: 0,
    });
    jest.spyOn(Company, "findById").mockReturnValue(createSessionQuery(company));
    jest.spyOn(User, "findOne").mockReturnValue(createSessionQuery(null));
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(null));
    const invitationCreate = jest
      .spyOn(CompanyInvitation, "create")
      .mockResolvedValue([invitation]);

    await createCompanyInvitation({
      companyId: ids.companyId,
      managerId: ids.managerId,
      managerRole: "manager",
      payload: {
        email: "employee@example.com",
        role: "employee",
        startingBalance: 5000,
      },
    });

    expect(invitationCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          role: "employee",
          currency: "GNF",
          startingBalance: 0,
        }),
      ],
      { session: expect.any(Object) },
    );
  });

  it("rejects employee or partner attempts to create invitations", async () => {
    mockMongooseSession();
    const ids = createIds();
    const companyFindById = jest.spyOn(Company, "findById");

    await expect(
      createCompanyInvitation({
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerRole: "employee",
        payload: {
          email: "partner@example.com",
          role: "partner",
          currency: "FCFA",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "INVITATION_MANAGER_REQUIRED",
    });
    expect(companyFindById).not.toHaveBeenCalled();
  });

  it("rejects duplicate pending invitations", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(Company, "findById").mockReturnValue(createSessionQuery(createCompany(ids)));
    jest.spyOn(User, "findOne").mockReturnValue(createSessionQuery(null));
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(createInvitation(ids)));

    await expect(
      createCompanyInvitation({
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerRole: "manager",
        payload: {
          email: "partner@example.com",
          role: "partner",
          currency: "FCFA",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "INVITATION_ALREADY_PENDING",
    });
  });

  it("rejects invitations for existing company members", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(Company, "findById").mockReturnValue(createSessionQuery(createCompany(ids)));
    jest
      .spyOn(User, "findOne")
      .mockReturnValue(createSessionQuery({ _id: ids.inviteeId }));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery({ _id: ids.membershipId }));

    await expect(
      createCompanyInvitation({
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerRole: "manager",
        payload: {
          email: "partner@example.com",
          role: "partner",
          currency: "FCFA",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "MEMBERSHIP_ALREADY_EXISTS",
    });
  });

  it("rejects invalid partner currency and balance", async () => {
    mockMongooseSession();
    const ids = createIds();

    await expect(
      createCompanyInvitation({
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerRole: "manager",
        payload: {
          email: "partner@example.com",
          role: "partner",
          currency: "USD",
          startingBalance: -1,
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_INVITATION_CURRENCY",
    });
  });

  it("lists company invitations scoped by the active company", async () => {
    const ids = createIds();
    const invitations = [createInvitation(ids)];
    const find = jest
      .spyOn(CompanyInvitation, "find")
      .mockReturnValue(createListQuery(invitations));

    const result = await listCompanyInvitations({
      companyId: ids.companyId,
      managerRole: "manager",
      status: "pending",
    });

    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      status: "pending",
    });
    expect(result).toBe(invitations);
  });

  it("lists only my pending non-expired invitations by email", async () => {
    const invitations = [
      createInvitation({
        ...createIds(),
        email: "partner@example.com",
      }),
    ];
    const find = jest
      .spyOn(CompanyInvitation, "find")
      .mockReturnValue(createListQuery(invitations));

    const result = await listMyInvitations({
      email: " PARTNER@EXAMPLE.COM ",
    });

    expect(find).toHaveBeenCalledWith({
      email: "partner@example.com",
      status: "pending",
      expiresAt: { $gt: expect.any(Date) },
    });
    expect(result).toBe(invitations);
  });

  it("accepts a matching pending invitation and creates an active membership", async () => {
    mockMongooseSession();
    const ids = createIds();
    const invitation = createInvitation({
      ...ids,
      email: "partner@example.com",
      role: "partner",
      currency: "GNF",
      startingBalance: 7500,
    });
    const membership = createMembership({
      ...ids,
      role: "partner",
      currency: "GNF",
      balance: 7500,
    });
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(invitation));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(null));
    const membershipCreate = jest
      .spyOn(CompanyMembership, "create")
      .mockResolvedValue([membership]);

    const result = await acceptCompanyInvitation({
      invitationId: ids.invitationId,
      userId: ids.inviteeId,
      userEmail: "PARTNER@example.com",
    });

    expect(membershipCreate).toHaveBeenCalledWith(
      [
        {
          user: ids.inviteeId,
          company: ids.companyId,
          role: "partner",
          status: "active",
          currency: "GNF",
          balance: 7500,
          invitedBy: ids.managerId,
          permissions: [],
        },
      ],
      { session: expect.any(Object) },
    );
    expect(invitation.status).toBe("accepted");
    expect(invitation.acceptedAt).toEqual(expect.any(Date));
    expect(invitation.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(result).toEqual({ invitation, membership });
  });

  it("does not allow the wrong email to accept an invitation", async () => {
    mockMongooseSession();
    const ids = createIds();
    const findOne = jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(null));

    await expect(
      acceptCompanyInvitation({
        invitationId: ids.invitationId,
        userId: ids.inviteeId,
        userEmail: "other@example.com",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "INVITATION_NOT_FOUND",
    });
    expect(findOne).toHaveBeenCalledWith({
      _id: ids.invitationId,
      email: "other@example.com",
      status: "pending",
      expiresAt: { $gt: expect.any(Date) },
    });
  });

  it("does not allow an existing member to accept a duplicate invitation", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(createInvitation(ids)));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery({ _id: ids.membershipId }));

    await expect(
      acceptCompanyInvitation({
        invitationId: ids.invitationId,
        userId: ids.inviteeId,
        userEmail: "invitee@example.com",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "MEMBERSHIP_ALREADY_EXISTS",
    });
  });

  it("does not accept expired invitations", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(null));

    await expect(
      acceptCompanyInvitation({
        invitationId: ids.invitationId,
        userId: ids.inviteeId,
        userEmail: "invitee@example.com",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "INVITATION_NOT_FOUND",
    });
  });

  it("rejects a matching pending invitation", async () => {
    mockMongooseSession();
    const ids = createIds();
    const invitation = createInvitation(ids);
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(invitation));

    const result = await rejectCompanyInvitation({
      invitationId: ids.invitationId,
      userEmail: "INVITEE@example.com",
    });

    expect(invitation.status).toBe("rejected");
    expect(invitation.rejectedAt).toEqual(expect.any(Date));
    expect(invitation.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(result).toBe(invitation);
  });

  it("revokes a pending company invitation by manager", async () => {
    mockMongooseSession();
    const ids = createIds();
    const invitation = createInvitation(ids);
    jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(invitation));

    const result = await revokeCompanyInvitation({
      invitationId: ids.invitationId,
      companyId: ids.companyId,
      managerId: ids.managerId,
      managerRole: "manager",
    });

    expect(invitation.status).toBe("revoked");
    expect(invitation.revokedBy).toBe(ids.managerId);
    expect(invitation.revokedAt).toEqual(expect.any(Date));
    expect(invitation.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(result).toBe(invitation);
  });

  it("does not let a manager revoke another company's invitation", async () => {
    mockMongooseSession();
    const ids = createIds();
    const findOne = jest
      .spyOn(CompanyInvitation, "findOne")
      .mockReturnValue(createSessionQuery(null));

    await expect(
      revokeCompanyInvitation({
        invitationId: ids.invitationId,
        companyId: ids.companyId,
        managerId: ids.managerId,
        managerRole: "manager",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "INVITATION_NOT_FOUND",
    });
    expect(findOne).toHaveBeenCalledWith({
      _id: ids.invitationId,
      company: ids.companyId,
      status: "pending",
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

function createSessionQuery(result) {
  return {
    session: jest.fn().mockResolvedValue(result),
  };
}

function createListQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    invitationId: new mongoose.Types.ObjectId(),
    inviteeId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    membershipId: new mongoose.Types.ObjectId(),
  };
}

function createCompany({
  companyId,
  baseCurrency = "FCFA",
}) {
  return {
    _id: companyId,
    name: "Akera Gold",
    code: "AKR",
    baseCurrency,
  };
}

function createInvitation({
  companyId,
  invitationId = new mongoose.Types.ObjectId(),
  email = "invitee@example.com",
  managerId = new mongoose.Types.ObjectId(),
  role = "partner",
  currency = "FCFA",
  startingBalance = 0,
}) {
  return {
    _id: invitationId,
    email,
    company: companyId,
    role,
    status: "pending",
    currency,
    startingBalance,
    invitedBy: managerId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function createMembership({
  companyId,
  inviteeId,
  membershipId = new mongoose.Types.ObjectId(),
  role = "partner",
  currency = "FCFA",
  balance = 0,
}) {
  return {
    _id: membershipId,
    user: inviteeId,
    company: companyId,
    role,
    status: "active",
    currency,
    balance,
    permissions: [],
  };
}
