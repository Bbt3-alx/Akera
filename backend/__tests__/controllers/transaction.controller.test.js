import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  getTransactionByCode,
  getTransactions,
  getTrialBalance,
  legacyTransactionRouteDisabled,
  normalizeCancelReason,
  normalizeReverseReason,
  serializeTransactionMutationResult,
} from "../../controllers/transaction.controller.js";
import { ApiError } from "../../middlewares/errorHandler.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import Transaction from "../../models/Transaction.js";

describe("transaction controller helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("transaction read controllers", () => {
    it("returns company transaction lists for managers", async () => {
      const companyId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const transaction = createTransaction({ company: companyId, createdBy: userId });
      const find = jest
        .spyOn(Transaction, "find")
        .mockReturnValue(createFindManyQuery([transaction]));
      jest.spyOn(Transaction, "countDocuments").mockResolvedValue(1);
      const req = createRequest({
        context: { companyId, role: "manager" },
        query: { page: "2", limit: "5", status: "pending" },
        user: { id: userId },
      });
      const res = createResponse();

      await getTransactions(req, res);

      expect(find).toHaveBeenCalledWith({
        company: companyId,
        status: "pending",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        code: 200,
        pagination: {
          page: 2,
          limit: 5,
          total: 1,
          totalPages: 1,
        },
        data: [
          expect.objectContaining({
            transactionCode: "AKR-000001",
            company: companyId.toString(),
          }),
        ],
      });
    });

    it("scopes transaction lists to the requesting partner", async () => {
      const companyId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const transaction = createTransaction({ company: companyId, createdBy: userId });
      const find = jest
        .spyOn(Transaction, "find")
        .mockReturnValue(createFindManyQuery([transaction]));
      const countDocuments = jest
        .spyOn(Transaction, "countDocuments")
        .mockResolvedValue(1);
      const req = createRequest({
        context: { companyId, role: "partner" },
        query: { status: "pending" },
        user: { id: userId },
      });
      const res = createResponse();

      await getTransactions(req, res);

      const expectedFilter = {
        company: companyId,
        createdBy: userId,
        status: "pending",
      };
      expect(find).toHaveBeenCalledWith(expectedFilter);
      expect(countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("allows managers to view a company transaction by code", async () => {
      const companyId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const transaction = createTransaction({
        company: companyId,
        createdBy: userId,
        transactionCode: "AKR-000004",
      });
      const findOne = jest
        .spyOn(Transaction, "findOne")
        .mockReturnValue(createFindOneQuery(transaction));
      const req = createRequest({
        context: { companyId, role: "manager" },
        params: { transactionCode: "AKR-000004" },
        user: { id: userId },
      });
      const res = createResponse();

      await getTransactionByCode(req, res);

      expect(findOne).toHaveBeenCalledWith({
        transactionCode: "AKR-000004",
        company: companyId,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          transactionCode: "AKR-000004",
        }),
      });
    });

    it("allows partners to view their own transaction by code", async () => {
      const companyId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const transaction = createTransaction({
        company: companyId,
        createdBy: userId,
        transactionCode: "AKR-000005",
      });
      const findOne = jest
        .spyOn(Transaction, "findOne")
        .mockReturnValue(createFindOneQuery(transaction));
      const req = createRequest({
        context: { companyId, role: "partner" },
        params: { transactionCode: "AKR-000005" },
        user: { id: userId },
      });
      const res = createResponse();

      await getTransactionByCode(req, res);

      expect(findOne).toHaveBeenCalledWith({
        transactionCode: "AKR-000005",
        company: companyId,
        createdBy: userId,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("does not let partners view another partner's transaction by code", async () => {
      const companyId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      jest.spyOn(Transaction, "findOne").mockReturnValue(createFindOneQuery(null));
      const req = createRequest({
        context: { companyId, role: "partner" },
        params: { transactionCode: "AKR-000006" },
        user: { id: userId },
      });
      const res = createResponse();

      await expect(getTransactionByCode(req, res)).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "TRANSACTION_NOT_FOUND",
      });
    });

    it("rejects trial balance for partners", async () => {
      const companyId = new mongoose.Types.ObjectId();
      const req = createRequest({
        context: { companyId, role: "partner" },
      });
      const res = createResponse();

      await expect(getTrialBalance(req, res)).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "TRIAL_BALANCE_MANAGER_REQUIRED",
      });
    });

    it("allows managers to read trial balance", async () => {
      const companyId = new mongoose.Types.ObjectId();
      jest.spyOn(LedgerEntry, "aggregate").mockResolvedValue([
        {
          _id: { currency: "FCFA", accountCode: "1000" },
          totalDebit: 100,
          totalCredit: 100,
        },
      ]);
      const req = createRequest({
        context: { companyId, role: "manager" },
      });
      const res = createResponse();

      await getTrialBalance(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          FCFA: {
            1000: 0,
          },
        },
      });
    });

    it("returns 410 for disabled legacy transaction mutation routes", () => {
      const res = createResponse();

      legacyTransactionRouteDisabled({}, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 410,
        message: "Legacy transaction route disabled.",
      });
    });
  });

  describe("serializeTransactionMutationResult", () => {
    it("wraps mutation responses with a safely serialized transaction", () => {
      const result = serializeTransactionMutationResult({
        _id: "tx-1",
        transactionCode: "AKR-000001",
        membership: {
          _id: "membership-1",
          user: {
            _id: "user-1",
            firstName: "Awa",
            lastName: "Diallo",
            email: "awa@example.com",
            password: "secret",
            transactionPinHash: "pin-hash",
          },
          balance: 500000,
          role: "partner",
        },
        createdBy: {
          _id: "user-1",
          firstName: "Awa",
          lastName: "Diallo",
          email: "awa@example.com",
        },
        companyAmount: 1000,
        companyCurrency: "FCFA",
      });

      expect(result).toEqual({
        transaction: expect.objectContaining({
          _id: "tx-1",
          id: "tx-1",
          transactionCode: "AKR-000001",
          membership: "membership-1",
          createdBy: "user-1",
          companyAmount: 1000,
          companyCurrency: "FCFA",
          partner: {
            membershipId: "membership-1",
            userId: "user-1",
            name: "Awa Diallo",
            email: "awa@example.com",
          },
        }),
      });
      expect(result.transaction).not.toHaveProperty("membership.user");
      expect(result.transaction.partner).not.toHaveProperty("password");
      expect(result.transaction.partner).not.toHaveProperty(
        "transactionPinHash",
      );
    });

    it("wraps reversed transactions without leaking request-only secrets", () => {
      const result = serializeTransactionMutationResult({
        _id: "tx-2",
        transactionCode: "AKR-000002",
        membership: "membership-2",
        createdBy: "creator-2",
        status: "reversed",
        reversedReason: "Manager correction",
        reverseReason: "legacy mismatch",
        transactionPin: "123456",
      });

      expect(result).toEqual({
        transaction: expect.objectContaining({
          _id: "tx-2",
          id: "tx-2",
          transactionCode: "AKR-000002",
          status: "reversed",
          reversedReason: "Manager correction",
        }),
      });
      expect(result.transaction).not.toHaveProperty("reverseReason");
      expect(result.transaction).not.toHaveProperty("transactionPin");
    });
  });

  describe("normalizeCancelReason", () => {
    it("trims string reasons", () => {
      expect(normalizeCancelReason("  Duplicate request  ")).toBe(
        "Duplicate request",
      );
    });

    it("treats omitted or blank reasons as undefined", () => {
      expect(normalizeCancelReason(undefined)).toBeUndefined();
      expect(normalizeCancelReason("   ")).toBeUndefined();
    });

    it("rejects non-string reasons", () => {
      expect(() => normalizeCancelReason(123)).toThrow(ApiError);
    });

    it("rejects reasons longer than 300 characters", () => {
      expect(() => normalizeCancelReason("a".repeat(301))).toThrow(
        "Cancel reason must be 300 characters or fewer",
      );
    });
  });

  describe("normalizeReverseReason", () => {
    it("trims string reasons", () => {
      expect(normalizeReverseReason("  Manager correction  ")).toBe(
        "Manager correction",
      );
    });

    it("treats omitted or blank reasons as undefined", () => {
      expect(normalizeReverseReason(undefined)).toBeUndefined();
      expect(normalizeReverseReason("   ")).toBeUndefined();
    });

    it("rejects non-string reasons", () => {
      expect(() => normalizeReverseReason(123)).toThrow(ApiError);
    });

    it("rejects reasons longer than 300 characters", () => {
      expect(() => normalizeReverseReason("a".repeat(301))).toThrow(
        "Reverse reason must be 300 characters or fewer",
      );
    });
  });
});

function createRequest({
  body = {},
  context,
  params = {},
  query = {},
  user = { id: "user-1" },
} = {}) {
  return {
    body,
    context,
    params,
    query,
    user,
  };
}

function createResponse() {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };

  return res;
}

function createFindOneQuery(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createFindManyQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createTransaction({
  _id = new mongoose.Types.ObjectId(),
  company = new mongoose.Types.ObjectId(),
  createdBy = new mongoose.Types.ObjectId(),
  transactionCode = "AKR-000001",
} = {}) {
  return {
    _id,
    transactionCode,
    company,
    membership: {
      _id: "membership-1",
      user: {
        _id: createdBy,
        firstName: "Awa",
        lastName: "Diallo",
        email: "awa@example.com",
      },
    },
    inputAmount: 1000,
    inputCurrency: "FCFA",
    partnerAmount: 1000,
    partnerCurrency: "FCFA",
    companyAmount: 1000,
    companyCurrency: "FCFA",
    beneficiaryName: "Mamadou Camara",
    status: "pending",
    idempotencyKey: "idem-1",
    createdBy,
    createdAt: "2026-06-12T10:00:00.000Z",
    updatedAt: "2026-06-12T10:00:00.000Z",
  };
}
