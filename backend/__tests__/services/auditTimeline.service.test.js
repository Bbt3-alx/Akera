import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import AuditLog from "../../models/AuditLog.js";
import {
  buildAuditLogQuery,
  listAuditTimelineLogs,
} from "../../services/auditTimeline.service.js";

describe("audit timeline service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lists company-scoped logs with filters, pagination, and newest-first sort", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const rows = [
      {
        _id: new mongoose.Types.ObjectId(),
        action: "TRANSACTION_PAY",
        companyId,
        collectionName: "Transaction",
        targetId: new mongoose.Types.ObjectId(),
        targetCode: "TRX-001",
        Timestamp: new Date("2026-07-07T10:00:00.000Z"),
      },
    ];
    const query = createAuditLogListQuery(rows);
    const find = jest.spyOn(AuditLog, "find").mockReturnValue(query);
    const count = jest
      .spyOn(AuditLog, "countDocuments")
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const result = await listAuditTimelineLogs({
      companyId,
      filters: {
        action: "TRANSACTION_PAY",
        collectionName: "Transaction",
        from: "2026-07-01",
        search: "TRX",
        to: "2026-07-31",
      },
      pagination: { page: 2, limit: 10 },
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRANSACTION_PAY",
        collectionName: "Transaction",
        companyId,
        targetCode: expect.any(RegExp),
        Timestamp: {
          $gte: new Date("2026-07-01T00:00:00.000Z"),
          $lte: new Date("2026-07-31T23:59:59.999Z"),
        },
      }),
    );
    expect(count).toHaveBeenNthCalledWith(1, find.mock.calls[0][0]);
    expect(query.populate).toHaveBeenCalledWith(
      "userId",
      "firstName lastName name email",
    );
    expect(query.sort).toHaveBeenCalledWith({ Timestamp: -1 });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      logs: rows,
      pagination: { page: 2, limit: 10, total: 12, pages: 2 },
      summary: { total: 12, today: 2, security: 0 },
    });
  });

  it("caps list limits and counts security events for visible filters", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const query = createAuditLogListQuery([]);
    jest.spyOn(AuditLog, "find").mockReturnValue(query);
    const count = jest
      .spyOn(AuditLog, "countDocuments")
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    await listAuditTimelineLogs({
      companyId,
      filters: { action: "SECURITY_TRANSACTION_PIN_CHANGE" },
      pagination: { page: 1, limit: 500 },
    });

    expect(query.limit).toHaveBeenCalledWith(100);
    expect(count).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        action: "SECURITY_TRANSACTION_PIN_CHANGE",
        companyId,
      }),
    );
  });

  it("builds escaped target-code search scoped to the active company", () => {
    const companyId = new mongoose.Types.ObjectId();

    const query = buildAuditLogQuery(companyId, { search: "TRX.001" });

    expect(query.companyId).toBe(companyId);
    expect(query.targetCode).toBeInstanceOf(RegExp);
    expect(query.targetCode.test("TRX.001")).toBe(true);
    expect(query.targetCode.test("TRXA001")).toBe(false);
  });
});

function createAuditLogListQuery(rows) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  };
}
