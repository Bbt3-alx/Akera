import { EventEmitter } from "node:events";
import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import AuditLog from "../../models/AuditLog.js";
import { audit } from "../../middlewares/audit.js";

describe("audit middleware", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs successful transaction creates from res.locals.audit", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const targetId = new mongoose.Types.ObjectId();
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const req = createRequest({
      context: { companyId },
      user: { id: userId },
    });
    const res = createResponse({
      locals: {
        audit: {
          targetId,
          targetCode: "AKR-000001",
          metadata: {
            status: "pending",
            inputAmount: 1000,
            inputCurrency: "FCFA",
            beneficiaryName: "Awa Diallo",
          },
        },
      },
    });

    await runAudit({
      action: "TRANSACTION_CREATE",
      req,
      res,
    });

    expect(auditCreate).toHaveBeenCalledWith({
      action: "TRANSACTION_CREATE",
      collectionName: "Transaction",
      targetId,
      targetCode: "AKR-000001",
      userId,
      companyId,
      details: {
        status: "pending",
        inputAmount: 1000,
        inputCurrency: "FCFA",
        beneficiaryName: "Awa Diallo",
      },
    });
  });

  it("logs successful transaction payments with targetCode from params", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const targetId = new mongoose.Types.ObjectId();
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const req = createRequest({
      params: { transactionCode: "AKR-000002" },
      context: { companyId },
      user: { id: userId },
    });
    const res = createResponse({
      locals: {
        audit: {
          targetId,
          metadata: {
            status: "completed",
            companyAmount: 5000,
            companyCurrency: "FCFA",
            receiptNumber: "RCP-0001",
          },
        },
      },
    });

    await runAudit({
      action: "TRANSACTION_PAY",
      req,
      res,
    });

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRANSACTION_PAY",
        collectionName: "Transaction",
        targetId,
        targetCode: "AKR-000002",
        userId,
        companyId,
        details: expect.objectContaining({
          status: "completed",
          companyAmount: 5000,
          companyCurrency: "FCFA",
          receiptNumber: "RCP-0001",
        }),
      }),
    );
  });

  it("logs successful transaction cancels", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const targetId = new mongoose.Types.ObjectId();
    const req = createRequest({
      params: { transactionCode: "AKR-000003" },
    });
    const res = createResponse({
      locals: {
        audit: {
          targetId,
          metadata: {
            status: "canceled",
            reason: "Duplicate request",
          },
        },
      },
    });

    await runAudit({
      action: "TRANSACTION_CANCEL",
      req,
      res,
    });

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRANSACTION_CANCEL",
        targetId,
        targetCode: "AKR-000003",
        details: {
          status: "canceled",
          reason: "Duplicate request",
        },
      }),
    );
  });

  it("logs successful transaction reversals", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const targetId = new mongoose.Types.ObjectId();
    const req = createRequest({
      params: { transactionCode: "AKR-000004" },
    });
    const res = createResponse({
      locals: {
        audit: {
          targetId,
          metadata: {
            status: "reversed",
            reason: "Manager correction",
          },
        },
      },
    });

    await runAudit({
      action: "TRANSACTION_REVERSE",
      req,
      res,
    });

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRANSACTION_REVERSE",
        targetId,
        targetCode: "AKR-000004",
        details: {
          status: "reversed",
          reason: "Manager correction",
        },
      }),
    );
  });

  it("does not log failed responses", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const req = createRequest({
      params: { transactionCode: "AKR-000005" },
    });
    const res = createResponse({
      statusCode: 409,
      locals: {
        audit: {
          targetId: new mongoose.Types.ObjectId(),
          metadata: { status: "pending" },
        },
      },
    });

    await runAudit({
      action: "TRANSACTION_PAY",
      req,
      res,
    });

    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("does not log transactionPin from request bodies", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const req = createRequest({
      body: {
        reason: "Manager correction",
        transactionPin: "123456",
      },
      params: { transactionCode: "AKR-000006" },
    });
    const res = createResponse({
      locals: {
        audit: {
          targetId: new mongoose.Types.ObjectId(),
          metadata: {
            status: "reversed",
            reason: "Manager correction",
          },
        },
      },
    });

    await runAudit({
      action: "TRANSACTION_REVERSE",
      req,
      res,
    });

    const [auditPayload] = auditCreate.mock.calls[0];
    expect(JSON.stringify(auditPayload)).not.toContain("transactionPin");
    expect(JSON.stringify(auditPayload)).not.toContain("123456");
  });

  it("uses companyId from req.context and userId from req.user", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const targetId = new mongoose.Types.ObjectId();
    const companyId = new mongoose.Types.ObjectId();
    const legacyCompanyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const req = createRequest({
      context: { companyId },
      user: { id: userId, company: legacyCompanyId },
    });
    const res = createResponse({
      locals: {
        audit: {
          targetId,
          targetCode: "AKR-000007",
          metadata: { status: "pending" },
        },
      },
    });

    await runAudit({
      action: "TRANSACTION_CREATE",
      req,
      res,
    });

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        userId,
      }),
    );
  });

  it("does not validate transactionCode as an ObjectId", async () => {
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});
    const req = createRequest({
      params: { transactionCode: "not-a-mongo-object-id" },
    });
    const res = createResponse({
      locals: {
        audit: {
          targetId: new mongoose.Types.ObjectId(),
          metadata: { status: "completed" },
        },
      },
    });

    const { next } = await runAudit({
      action: "TRANSACTION_PAY",
      req,
      res,
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        targetCode: "not-a-mongo-object-id",
      }),
    );
  });
});

function createRequest({
  body = {},
  context = { companyId: new mongoose.Types.ObjectId() },
  method = "POST",
  params = {},
  user = { id: new mongoose.Types.ObjectId() },
} = {}) {
  return {
    body,
    context,
    method,
    params,
    user,
  };
}

function createResponse({ locals = {}, statusCode = 200 } = {}) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.locals = locals;
  res.status = jest.fn((nextStatusCode) => {
    res.statusCode = nextStatusCode;
    return res;
  });
  res.json = jest.fn(() => res);
  return res;
}

async function runAudit({ action, req, res }) {
  const next = jest.fn();
  await audit(action, "Transaction")(req, res, next);
  res.emit("finish");
  await flushPromises();

  return { next };
}

function flushPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
