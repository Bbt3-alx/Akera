import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import Company from "../../models/Company.js";
import CompanyExchangeRate from "../../models/CompanyExchangeRate.js";
import CompanyInvitation from "../../models/CompanyInvitation.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import Transaction from "../../models/Transaction.js";
import { getCompanyDashboard } from "../../services/dashboard.service.js";

describe("dashboard service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds a manager dashboard with company-wide metrics, cash, invitations, and accounting", async () => {
    const ids = createIds();
    mockCompany(ids);
    mockExchangeRate(null);
    const aggregate = mockTransactionAggregate({
      pending: 1,
      processing: 1,
      completed: 2,
      canceled: 1,
      reversed: 1,
      total: 7,
      completedCompanyAmount: 3000,
      pendingCompanyAmount: 500,
      todayCompletedCompanyAmount: 2000,
    });
    mockRecentTransactions([createTransaction(ids)]);
    const countDocuments = jest
      .spyOn(CompanyInvitation, "countDocuments")
      .mockResolvedValue(3);
    jest.spyOn(LedgerEntry, "aggregate").mockResolvedValue([
      {
        _id: { currency: "FCFA", accountCode: "1000" },
        totalDebit: 100,
        totalCredit: 100,
      },
    ]);

    const dashboard = await getCompanyDashboard({
      companyId: ids.companyId.toHexString(),
      membershipId: ids.managerMembershipId.toHexString(),
      userId: ids.managerId,
      role: "manager",
      now: new Date("2026-06-13T12:00:00.000Z"),
    });

    const managerMatch = aggregate.mock.calls[0][0][0].$match;
    expect(managerMatch.company).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(managerMatch.company.toHexString()).toBe(ids.companyId.toHexString());
    expect(countDocuments).toHaveBeenCalledWith({
      company: ids.companyId.toHexString(),
      status: "pending",
    });
    expect(dashboard).toEqual({
      company: {
        id: ids.companyId.toHexString(),
        name: "Akera Gold",
        baseCurrency: "FCFA",
      },
      viewer: {
        role: "manager",
      },
      exchangeRate: {
        configured: false,
        rate: null,
        from: "FCFA",
        to: "GNF",
        updatedAt: null,
      },
      cash: {
        visible: true,
        balance: 25000,
        currency: "FCFA",
      },
      transactions: {
        scope: "company",
        counts: {
          pending: 1,
          processing: 1,
          canceling: 0,
          completed: 2,
          canceled: 1,
          reversing: 0,
          reversed: 1,
          total: 7,
        },
        totals: {
          completedCompanyAmount: 3000,
          pendingCompanyAmount: 500,
          todayCompletedCompanyAmount: 2000,
        },
        recent: [
          {
            id: ids.transactionId.toHexString(),
            transactionCode: "AKR-000001",
            status: "completed",
            inputAmount: 1000,
            inputCurrency: "FCFA",
            companyAmount: 1000,
            companyCurrency: "FCFA",
            beneficiaryName: "Mamadou Camara",
            partner: {
              membershipId: ids.membershipId.toHexString(),
              userId: ids.partnerId.toHexString(),
              name: "Awa Diallo",
              email: "awa@example.com",
            },
            createdAt: new Date("2026-06-13T09:00:00.000Z"),
            processedAt: new Date("2026-06-13T10:00:00.000Z"),
          },
        ],
      },
      invitations: {
        visible: true,
        pendingCount: 3,
      },
      accounting: {
        visible: true,
        trialBalance: {
          FCFA: {
            1000: 0,
          },
        },
        error: null,
      },
    });
    expect(JSON.stringify(dashboard)).not.toContain("idempotencyKey");
    expect(JSON.stringify(dashboard)).not.toContain("secret-idem");
  });

  it("builds a partner dashboard scoped to the requesting partner and hides company-private sections", async () => {
    const ids = createIds();
    mockCompany(ids);
    mockExchangeRate({
      rate: 86000,
      from: "FCFA",
      to: "GNF",
      updatedAt: new Date("2026-06-13T08:30:00.000Z"),
    });
    const aggregate = mockTransactionAggregate({
      pending: 1,
      processing: 0,
      completed: 1,
      canceled: 0,
      reversed: 0,
      total: 2,
      completedCompanyAmount: 1000,
      pendingCompanyAmount: 500,
      todayCompletedCompanyAmount: 1000,
    });
    const find = mockRecentTransactions([createTransaction(ids)]);
    const countDocuments = jest.spyOn(CompanyInvitation, "countDocuments");
    const ledgerAggregate = jest.spyOn(LedgerEntry, "aggregate");

    const dashboard = await getCompanyDashboard({
      companyId: ids.companyId.toHexString(),
      membershipId: ids.membershipId.toHexString(),
      userId: ids.partnerId.toHexString(),
      role: "partner",
      now: new Date("2026-06-13T12:00:00.000Z"),
    });

    const partnerMatch = aggregate.mock.calls[0][0][0].$match;
    expect(partnerMatch.company).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(partnerMatch.company.toHexString()).toBe(ids.companyId.toHexString());
    expect(partnerMatch.$or).toHaveLength(2);
    expect(partnerMatch.$or[0].membership).toBeInstanceOf(
      mongoose.Types.ObjectId,
    );
    expect(partnerMatch.$or[0].membership.toHexString()).toBe(
      ids.membershipId.toHexString(),
    );
    expect(partnerMatch.$or[1].createdBy).toBeInstanceOf(
      mongoose.Types.ObjectId,
    );
    expect(partnerMatch.$or[1].createdBy.toHexString()).toBe(
      ids.partnerId.toHexString(),
    );
    expect(find).toHaveBeenCalledWith(partnerMatch);
    expect(countDocuments).not.toHaveBeenCalled();
    expect(ledgerAggregate).not.toHaveBeenCalled();
    expect(dashboard.transactions.scope).toBe("mine");
    expect(dashboard.cash).toEqual({
      visible: false,
      balance: null,
      currency: null,
    });
    expect(dashboard.invitations).toEqual({
      visible: false,
      pendingCount: null,
    });
    expect(dashboard.accounting).toEqual({
      visible: false,
      trialBalance: null,
      error: null,
    });
    expect(dashboard.exchangeRate).toEqual({
      configured: true,
      rate: 86000,
      from: "FCFA",
      to: "GNF",
      updatedAt: "2026-06-13T08:30:00.000Z",
    });
  });

  it("lets employees see company transaction metrics without cash or trial balance", async () => {
    const ids = createIds();
    mockCompany(ids);
    mockExchangeRate(null);
    mockTransactionAggregate({
      pending: 0,
      processing: 0,
      canceling: 0,
      completed: 1,
      canceled: 0,
      reversing: 0,
      reversed: 0,
      total: 1,
      completedCompanyAmount: 1000,
      pendingCompanyAmount: 0,
      todayCompletedCompanyAmount: 1000,
    });
    mockRecentTransactions([]);
    const ledgerAggregate = jest.spyOn(LedgerEntry, "aggregate");

    const dashboard = await getCompanyDashboard({
      companyId: ids.companyId,
      membershipId: ids.employeeMembershipId,
      userId: ids.employeeId,
      role: "employee",
    });

    expect(dashboard.transactions.scope).toBe("company");
    expect(dashboard.cash).toEqual({
      visible: false,
      balance: null,
      currency: null,
    });
    expect(dashboard.accounting).toEqual({
      visible: false,
      trialBalance: null,
      error: null,
    });
    expect(ledgerAggregate).not.toHaveBeenCalled();
  });

  it("includes canceling and reversing counts in dashboard summaries", async () => {
    const ids = createIds();
    mockCompany(ids);
    mockExchangeRate(null);
    mockTransactionAggregate({
      pending: 1,
      processing: 1,
      canceling: 1,
      completed: 1,
      canceled: 1,
      reversing: 1,
      reversed: 1,
      total: 7,
      completedCompanyAmount: 1000,
      pendingCompanyAmount: 500,
      todayCompletedCompanyAmount: 1000,
    });
    mockRecentTransactions([]);
    jest.spyOn(CompanyInvitation, "countDocuments").mockResolvedValue(0);
    jest.spyOn(LedgerEntry, "aggregate").mockResolvedValue([]);

    const dashboard = await getCompanyDashboard({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
    });

    expect(dashboard.transactions.counts).toEqual({
      pending: 1,
      processing: 1,
      canceling: 1,
      completed: 1,
      canceled: 1,
      reversing: 1,
      reversed: 1,
      total: 7,
    });
  });

  it("returns a manager dashboard with accounting error when trial balance fails", async () => {
    const ids = createIds();
    mockCompany(ids);
    mockExchangeRate(null);
    mockTransactionAggregate({
      pending: 0,
      processing: 0,
      canceling: 0,
      completed: 0,
      canceled: 0,
      reversing: 0,
      reversed: 0,
      total: 0,
      completedCompanyAmount: 0,
      pendingCompanyAmount: 0,
      todayCompletedCompanyAmount: 0,
    });
    mockRecentTransactions([]);
    jest.spyOn(CompanyInvitation, "countDocuments").mockResolvedValue(0);
    jest
      .spyOn(LedgerEntry, "aggregate")
      .mockRejectedValue(new Error("Trial balance not balanced"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const dashboard = await getCompanyDashboard({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
    });

    expect(dashboard.accounting).toEqual({
      visible: true,
      trialBalance: null,
      error: "TRIAL_BALANCE_ERROR",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Dashboard trial balance failed",
      expect.objectContaining({
        companyId: ids.companyId,
        errorCode: "TRIAL_BALANCE_ERROR",
      }),
    );
  });

  it("throws when the active company context no longer resolves to a company", async () => {
    const ids = createIds();
    jest.spyOn(Company, "findById").mockReturnValue(createCompanyQuery(null));

    await expect(
      getCompanyDashboard({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "COMPANY_NOT_FOUND",
    });
  });
});

function mockCompany({ companyId }) {
  jest.spyOn(Company, "findById").mockReturnValue(
    createCompanyQuery({
      _id: companyId,
      name: "Akera Gold",
      balance: 25000,
      baseCurrency: "FCFA",
    }),
  );
}

function mockExchangeRate(rate) {
  jest
    .spyOn(CompanyExchangeRate, "findOne")
    .mockReturnValue(createLeanQuery(rate));
}

function mockTransactionAggregate(result) {
  return jest.spyOn(Transaction, "aggregate").mockResolvedValue([result]);
}

function mockRecentTransactions(transactions) {
  return jest
    .spyOn(Transaction, "find")
    .mockReturnValue(createFindManyQuery(transactions));
}

function createCompanyQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnThis(),
  };
}

function createLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createFindManyQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    employeeId: new mongoose.Types.ObjectId(),
    employeeMembershipId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    membershipId: new mongoose.Types.ObjectId(),
    partnerId: new mongoose.Types.ObjectId(),
    transactionId: new mongoose.Types.ObjectId(),
  };
}

function createTransaction({
  companyId,
  membershipId,
  partnerId,
  transactionId,
}) {
  return {
    _id: transactionId,
    transactionCode: "AKR-000001",
    company: companyId,
    membership: {
      _id: membershipId,
      user: {
        _id: partnerId,
        firstName: "Awa",
        lastName: "Diallo",
        email: "awa@example.com",
        password: "secret-password",
      },
    },
    inputAmount: 1000,
    inputCurrency: "FCFA",
    partnerAmount: 1000,
    partnerCurrency: "FCFA",
    companyAmount: 1000,
    companyCurrency: "FCFA",
    beneficiaryName: "Mamadou Camara",
    status: "completed",
    idempotencyKey: "secret-idem",
    createdBy: partnerId,
    createdAt: new Date("2026-06-13T09:00:00.000Z"),
    processedAt: new Date("2026-06-13T10:00:00.000Z"),
  };
}
