import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../utils/generateReceiptPdf.js", () => ({
  generateReceiptPdf: jest.fn(async ({ receiptNumber }) =>
    `/tmp/receipt-${receiptNumber}.pdf`
  ),
}));

import Company from "../../models/Company.js";
import CompanyBranding from "../../models/CompanyBranding.js";
import Receipt from "../../models/Receipt.js";
import { generateReceiptPdf } from "../../utils/generateReceiptPdf.js";
import { generateReceipt } from "../../services/receipt.service.js";

describe("receipt service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    generateReceiptPdf.mockClear();
  });

  it("generates different first receipt numbers for companies with the default prefix", async () => {
    const companyAId = new mongoose.Types.ObjectId("000000000000000000a8f23c");
    const companyBId = new mongoose.Types.ObjectId("000000000000000000b7e91d");
    mockCompanyLookup();
    jest.spyOn(Receipt, "findOne").mockReturnValue(createSessionQuery(null));
    jest.spyOn(CompanyBranding, "findOneAndUpdate").mockResolvedValue({
      receiptPrefix: "RCPT",
      receiptCounter: 1,
      primaryColor: "#1A73E8",
      footerText: "Generated securely by Akera system",
    });
    jest.spyOn(Receipt, "create").mockImplementation(createReceiptDocument);

    const receiptA = await generateReceipt({
      transaction: createTransaction({ companyId: companyAId }),
      companyId: companyAId,
      managerId: new mongoose.Types.ObjectId(),
      session: "session-1",
    });
    const receiptB = await generateReceipt({
      transaction: createTransaction({ companyId: companyBId }),
      companyId: companyBId,
      managerId: new mongoose.Types.ObjectId(),
      session: "session-1",
    });

    expect(receiptA.receiptNumber).toBe("RCPT-A8F23C-000001");
    expect(receiptB.receiptNumber).toBe("RCPT-B7E91D-000001");
    expect(receiptA.receiptNumber).not.toBe(receiptB.receiptNumber);
  });

  it("returns an existing receipt for a repeated transaction without incrementing the counter", async () => {
    const existingReceipt = {
      _id: new mongoose.Types.ObjectId(),
      receiptNumber: "RCPT-A8F23C-000001",
    };
    jest
      .spyOn(Receipt, "findOne")
      .mockReturnValue(createSessionQuery(existingReceipt));
    jest.spyOn(Company, "findById").mockReturnValue(
      createSessionQuery({
        _id: new mongoose.Types.ObjectId("000000000000000000a8f23c"),
        name: "Akera Gold",
      }),
    );
    const incrementCounter = jest
      .spyOn(CompanyBranding, "findOneAndUpdate")
      .mockResolvedValue({
        receiptPrefix: "RCPT",
        receiptCounter: 2,
      });
    const createReceipt = jest.spyOn(Receipt, "create");

    const result = await generateReceipt({
      transaction: createTransaction({
        companyId: new mongoose.Types.ObjectId("000000000000000000a8f23c"),
      }),
      companyId: new mongoose.Types.ObjectId("000000000000000000a8f23c"),
      managerId: new mongoose.Types.ObjectId(),
      session: "session-1",
    });

    expect(result).toBe(existingReceipt);
    expect(incrementCounter).not.toHaveBeenCalled();
    expect(createReceipt).not.toHaveBeenCalled();
    expect(generateReceiptPdf).not.toHaveBeenCalled();
  });

  it("retries with the next counter when receipt number creation collides", async () => {
    const companyId = new mongoose.Types.ObjectId("000000000000000000a8f23c");
    const duplicateReceiptNumberError = Object.assign(
      new Error("E11000 duplicate key error"),
      {
        code: 11000,
        keyPattern: { receiptNumber: 1 },
      },
    );
    mockCompanyLookup();
    jest.spyOn(Receipt, "findOne").mockReturnValue(createSessionQuery(null));
    jest
      .spyOn(CompanyBranding, "findOneAndUpdate")
      .mockResolvedValueOnce({
        receiptPrefix: "RCPT",
        receiptCounter: 1,
      })
      .mockResolvedValueOnce({
        receiptPrefix: "RCPT",
        receiptCounter: 2,
      });
    jest
      .spyOn(Receipt, "create")
      .mockRejectedValueOnce(duplicateReceiptNumberError)
      .mockImplementationOnce(createReceiptDocument);

    const receipt = await generateReceipt({
      transaction: createTransaction({ companyId }),
      companyId,
      managerId: new mongoose.Types.ObjectId(),
      session: "session-1",
    });

    expect(receipt.receiptNumber).toBe("RCPT-A8F23C-000002");
    expect(CompanyBranding.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(Receipt.create).toHaveBeenCalledTimes(2);
  });

  it("keeps receipt numbers globally unique", () => {
    expect(Receipt.schema.path("receiptNumber").options.unique).toBe(true);
  });
});

function mockCompanyLookup() {
  jest.spyOn(Company, "findById").mockImplementation((companyId) =>
    createSessionQuery({
      _id: companyId,
      name: "Akera Gold",
      receiptPrefix: "RCPT",
    }),
  );
}

function createReceiptDocument([data]) {
  return Promise.resolve([
    {
      _id: new mongoose.Types.ObjectId(),
      ...data,
    },
  ]);
}

function createSessionQuery(result) {
  return {
    session: jest.fn().mockResolvedValue(result),
  };
}

function createTransaction({ companyId }) {
  return {
    _id: new mongoose.Types.ObjectId(),
    transactionCode: "AKR-000001",
    company: companyId,
    inputAmount: 1000,
    inputCurrency: "FCFA",
    companyAmount: 1000,
    companyCurrency: "FCFA",
    partnerAmount: 1000,
    partnerCurrency: "FCFA",
    exchangeRate: 1,
    beneficiaryName: "Awa Diallo",
    processedAt: new Date("2026-06-14T10:00:00.000Z"),
  };
}
