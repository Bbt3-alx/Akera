import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import CorrespondentCollection from "../../models/CorrespondentCollection.js";
import Payment from "../../models/Payment.js";
import Receipt from "../../models/Receipt.js";
import ReconciliationIssue from "../../models/ReconciliationIssue.js";
import RemoteAgentPayout from "../../models/RemoteAgentPayout.js";
import Transaction from "../../models/Transaction.js";
import {
  listReconciliationIssues,
  resolveReconciliationIssue,
  scanCompanyReconciliation,
} from "../../services/reconciliation.service.js";

describe("reconciliation service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates an open issue for a completed transaction missing a receipt", async () => {
    const ids = createIds();
    const transaction = {
      _id: ids.transactionId,
      company: ids.companyId,
      transactionCode: "TRX-001",
      status: "completed",
      companyAmount: 12500,
      companyCurrency: "FCFA",
      createdAt: new Date("2026-01-10T00:00:00.000Z"),
    };
    mockFind(Transaction, [transaction]);
    mockFind(Payment, []);
    mockFind(Receipt, []);
    mockFind(CorrespondentCollection, []);
    mockFind(RemoteAgentPayout, []);
    const existingIssueQuery = mockFindOne(ReconciliationIssue, null);
    jest.spyOn(ReconciliationIssue, "countDocuments").mockResolvedValue(1);
    const create = jest
      .spyOn(ReconciliationIssue, "create")
      .mockResolvedValue(createIssue({ referenceCode: "TRX-001" }));

    const result = await scanCompanyReconciliation({
      companyId: ids.companyId,
      from: "2026-01-01",
      to: "2026-01-31",
    });

    expect(result).toEqual({
      created: 1,
      detectedAt: expect.any(Date),
      open: 1,
      scanned: expect.objectContaining({
        transactions: 1,
      }),
    });
    expect(existingIssueQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        company: ids.companyId,
        issueType: "paid_transaction_missing_receipt",
        sourceKey: `Transaction:${ids.transactionId.toString()}`,
        status: "open",
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        company: ids.companyId,
        workflowType: "transaction",
        issueType: "paid_transaction_missing_receipt",
        severity: "critical",
        status: "open",
        expectedAmount: 12500,
        actualAmount: 0,
        currency: "FCFA",
        difference: 12500,
        referenceCode: "TRX-001",
      }),
    );
  });

  it("does not duplicate an already-open issue on repeated scans", async () => {
    const ids = createIds();
    mockFind(Transaction, [
      {
        _id: ids.transactionId,
        company: ids.companyId,
        transactionCode: "TRX-002",
        status: "completed",
        companyAmount: 7000,
        companyCurrency: "GNF",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
    mockFind(Payment, []);
    mockFind(Receipt, []);
    mockFind(CorrespondentCollection, []);
    mockFind(RemoteAgentPayout, []);
    mockFindOne(ReconciliationIssue, createIssue({ referenceCode: "TRX-002" }));
    jest.spyOn(ReconciliationIssue, "countDocuments").mockResolvedValue(1);
    const create = jest.spyOn(ReconciliationIssue, "create");

    const result = await scanCompanyReconciliation({ companyId: ids.companyId });

    expect(result.created).toBe(0);
    expect(result.open).toBe(1);
    expect(create).not.toHaveBeenCalled();
  });

  it("detects payment and workflow status mismatches", async () => {
    const ids = createIds();
    mockFind(Transaction, []);
    mockFind(Payment, [
      {
        _id: ids.paymentId,
        company: ids.companyId,
        reference: "PAY-001",
        status: "completed",
        amount: 5000,
        currency: "FCFA",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);
    mockFind(Receipt, []);
    mockFind(CorrespondentCollection, [
      {
        _id: ids.collectionId,
        company: ids.companyId,
        collectionCode: "COL-001",
        status: "paid",
        amount: 5000,
        currency: "FCFA",
        accountOperation: null,
        createdAt: new Date("2026-03-02T00:00:00.000Z"),
      },
    ]);
    mockFind(RemoteAgentPayout, [
      {
        _id: ids.payoutId,
        company: ids.companyId,
        payoutCode: "RAP-001",
        status: "paid",
        amount: 2500,
        currency: "FCFA",
        accountOperation: null,
        createdAt: new Date("2026-03-03T00:00:00.000Z"),
      },
    ]);
    mockFindOne(ReconciliationIssue, null);
    jest.spyOn(ReconciliationIssue, "countDocuments").mockResolvedValue(3);
    const create = jest
      .spyOn(ReconciliationIssue, "create")
      .mockImplementation(async (payload) => createIssue(payload));

    const result = await scanCompanyReconciliation({ companyId: ids.companyId });

    expect(result.created).toBe(3);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        issueType: "payment_missing_receipt",
        referenceCode: "PAY-001",
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        issueType: "correspondent_collection_missing_account_operation",
        referenceCode: "COL-001",
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        issueType: "remote_agent_payout_missing_account_operation",
        referenceCode: "RAP-001",
      }),
    );
  });

  it("lists issues with filters and pagination", async () => {
    const ids = createIds();
    const issue = createIssue({ company: ids.companyId, referenceCode: "TRX-123" });
    const issueQuery = createIssueListQuery([issue]);
    const count = jest
      .spyOn(ReconciliationIssue, "countDocuments")
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    const find = jest.spyOn(ReconciliationIssue, "find").mockReturnValue(issueQuery);

    const result = await listReconciliationIssues({
      companyId: ids.companyId,
      filters: {
        status: "open",
        severity: "critical",
        workflowType: "transaction",
        search: "TRX",
        from: "2026-01-01",
        to: "2026-01-31",
      },
      pagination: { page: 2, limit: 10 },
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        company: ids.companyId,
        status: "open",
        severity: "critical",
        workflowType: "transaction",
        referenceCode: expect.any(RegExp),
        detectedAt: {
          $gte: new Date("2026-01-01T00:00:00.000Z"),
          $lte: new Date("2026-01-31T23:59:59.999Z"),
        },
      }),
    );
    expect(count).toHaveBeenCalledWith(find.mock.calls[0][0]);
    expect(issueQuery.sort).toHaveBeenCalledWith({ detectedAt: -1 });
    expect(issueQuery.skip).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      issues: [issue],
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        pages: 1,
      },
      summary: {
        critical: 1,
        open: 1,
        resolved: 0,
      },
    });
  });

  it("resolves an open issue with note and resolver", async () => {
    const ids = createIds();
    const issue = createIssue({
      _id: ids.issueId,
      company: ids.companyId,
      status: "open",
    });
    issue.save = jest.fn(async () => issue);
    jest.spyOn(ReconciliationIssue, "findOne").mockResolvedValue(issue);

    const result = await resolveReconciliationIssue({
      companyId: ids.companyId,
      issueId: ids.issueId,
      userId: ids.userId,
      note: "Receipt was generated manually.",
    });

    expect(result).toBe(issue);
    expect(issue.status).toBe("resolved");
    expect(issue.resolvedBy).toBe(ids.userId);
    expect(issue.resolutionNote).toBe("Receipt was generated manually.");
    expect(issue.resolvedAt).toBeInstanceOf(Date);
    expect(issue.save).toHaveBeenCalled();
  });

  it("rejects resolving issues outside the active company", async () => {
    jest.spyOn(ReconciliationIssue, "findOne").mockResolvedValue(null);

    await expect(
      resolveReconciliationIssue({
        companyId: new mongoose.Types.ObjectId(),
        issueId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        note: "Resolved.",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "RECONCILIATION_ISSUE_NOT_FOUND",
    });
  });
});

function createIds() {
  return {
    collectionId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    issueId: new mongoose.Types.ObjectId(),
    paymentId: new mongoose.Types.ObjectId(),
    payoutId: new mongoose.Types.ObjectId(),
    transactionId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
  };
}

function createIssue(overrides = {}) {
  return {
    _id: overrides._id ?? new mongoose.Types.ObjectId(),
    company: overrides.company ?? new mongoose.Types.ObjectId(),
    workflowType: overrides.workflowType ?? "transaction",
    issueType: overrides.issueType ?? "paid_transaction_missing_receipt",
    severity: overrides.severity ?? "critical",
    status: overrides.status ?? "open",
    sourceRefs: overrides.sourceRefs ?? [],
    sourceKey: overrides.sourceKey ?? "Transaction:1",
    expectedAmount: overrides.expectedAmount ?? 1000,
    actualAmount: overrides.actualAmount ?? 0,
    currency: overrides.currency ?? "FCFA",
    difference: overrides.difference ?? 1000,
    referenceCode: overrides.referenceCode ?? "TRX-001",
    detectedAt: overrides.detectedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function mockFind(model, rows) {
  return jest.spyOn(model, "find").mockReturnValue({
    lean: jest.fn().mockResolvedValue(rows),
  });
}

function mockFindOne(model, value) {
  return jest.spyOn(model, "findOne").mockResolvedValue(value);
}

function createIssueListQuery(rows) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  };
}
