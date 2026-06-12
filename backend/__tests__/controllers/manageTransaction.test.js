import { afterEach, describe, expect, it, jest } from "@jest/globals";
import mongoose from "mongoose";

import {
  getPartnerTransactions,
  getTransaction,
  getTransactionByCode,
} from "../../controllers/manageTransaction.js";
import Transaction from "../../models/Transaction.js";

describe("manage transaction read controllers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows partners to view their own company transaction by code", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const transaction = createTransaction({
      company: companyId,
      createdBy: userId,
      transactionCode: "AKR-000001",
    });
    const findOne = jest
      .spyOn(Transaction, "findOne")
      .mockReturnValue(createFindOneQuery(transaction));
    const req = createRequest({
      context: { companyId, role: "partner" },
      params: { transactionCode: "AKR-000001" },
      user: { id: userId },
    });
    const res = createResponse();

    await getTransactionByCode(req, res);

    expect(findOne).toHaveBeenCalledWith({
      transactionCode: "AKR-000001",
      company: companyId,
      createdBy: userId,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        transactionCode: "AKR-000001",
        company: companyId.toString(),
        createdBy: userId.toString(),
        partner: {
          membershipId: "membership-1",
          userId: userId.toString(),
          name: "Awa Diallo",
          email: "awa@example.com",
        },
      }),
    });
  });

  it("keeps manager transaction lookup by code company scoped", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    jest
      .spyOn(Transaction, "findOne")
      .mockReturnValue(createFindOneQuery(createTransaction({ company: companyId })));
    const req = createRequest({
      context: { companyId, role: "manager" },
      params: { transactionCode: "AKR-000002" },
      user: { id: userId },
    });
    const res = createResponse();

    await getTransactionByCode(req, res);

    expect(Transaction.findOne).toHaveBeenCalledWith({
      transactionCode: "AKR-000002",
      company: companyId,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does not return another partner's transaction by code", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const findOne = jest
      .spyOn(Transaction, "findOne")
      .mockReturnValue(createFindOneQuery(null));
    const req = createRequest({
      context: { companyId, role: "partner" },
      params: { transactionCode: "AKR-000003" },
      user: { id: userId },
    });
    const res = createResponse();

    await getTransactionByCode(req, res);

    expect(findOne).toHaveBeenCalledWith({
      transactionCode: "AKR-000003",
      company: companyId,
      createdBy: userId,
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Transaction not found",
    });
  });

  it("scopes partner transaction lookup by id to the requesting user", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const transactionId = new mongoose.Types.ObjectId();
    const findOne = jest
      .spyOn(Transaction, "findOne")
      .mockReturnValue(createFindOneQuery(createTransaction({
        _id: transactionId,
        company: companyId,
        createdBy: userId,
      })));
    const req = createRequest({
      context: { companyId, role: "partner" },
      params: { id: transactionId },
      user: { id: userId },
    });
    const res = createResponse();

    await getTransaction(req, res);

    expect(findOne).toHaveBeenCalledWith({
      _id: transactionId,
      company: companyId,
      createdBy: userId,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("lists only partner-owned transactions in the active company", async () => {
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
      query: { page: 2, limit: 5, status: "pending" },
      user: { id: userId },
    });
    const res = createResponse();

    await getPartnerTransactions(req, res);

    const expectedFilter = {
      company: companyId,
      createdBy: userId,
      status: "pending",
    };
    expect(find).toHaveBeenCalledWith(expectedFilter);
    expect(countDocuments).toHaveBeenCalledWith(expectedFilter);
    expect(find.mock.calls[0][0]).not.toHaveProperty("initiatedBy");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      pagination: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
      data: [
        expect.objectContaining({
          transactionCode: "AKR-000001",
          createdBy: userId.toString(),
        }),
      ],
    });
  });
});

function createRequest({
  context,
  params = {},
  query = {},
  user,
}) {
  return {
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
