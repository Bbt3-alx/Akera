import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import { serializeReceipt } from "../../serializers/receipt.serializer.js";

describe("receipt serializer", () => {
  it("serializes only safe receipt fields with a download URL", () => {
    const receipt = {
      _id: "receipt-1",
      receiptNumber: "RCPT-000001",
      transaction: "transaction-1",
      company: "company-1",
      snapshot: {
        companyAmount: 25000,
        companyCurrency: "FCFA",
        inputAmount: 25000,
        inputCurrency: "FCFA",
      },
      signatureHash: "signature-hash",
      pdfPath: "private/receipts/receipt-1.pdf",
      generatedBy: "manager-1",
      createdAt: "2026-06-11T18:00:00.000Z",
      updatedAt: "2026-06-11T18:01:00.000Z",
    };

    expect(serializeReceipt(receipt)).toEqual({
      id: "receipt-1",
      receiptNumber: "RCPT-000001",
      transaction: "transaction-1",
      company: "company-1",
      amount: 25000,
      currency: "FCFA",
      createdAt: "2026-06-11T18:00:00.000Z",
      downloadUrl: "/api/v1/transactions/receipt/receipt-1",
    });
  });

  it("serializes Mongoose ObjectId values without exposing private fields", () => {
    const receiptId = new mongoose.Types.ObjectId("64f000000000000000000011");
    const transactionId = new mongoose.Types.ObjectId(
      "64f000000000000000000012",
    );
    const companyId = new mongoose.Types.ObjectId("64f000000000000000000013");

    const serialized = serializeReceipt({
      _id: receiptId,
      receiptNumber: "RCPT-000002",
      transaction: transactionId,
      company: companyId,
      snapshot: {
        companyAmount: 9000,
        companyCurrency: "GNF",
      },
      pdfPath: "private/receipts/receipt-2.pdf",
      signatureHash: "signature-hash",
      generatedBy: "manager-1",
      createdAt: "2026-06-11T18:00:00.000Z",
    });

    expect(serialized).toEqual({
      id: receiptId.toString(),
      receiptNumber: "RCPT-000002",
      transaction: transactionId.toString(),
      company: companyId.toString(),
      amount: 9000,
      currency: "GNF",
      createdAt: "2026-06-11T18:00:00.000Z",
      downloadUrl: `/api/v1/transactions/receipt/${receiptId.toString()}`,
    });
    expect(serialized).not.toHaveProperty("pdfPath");
    expect(serialized).not.toHaveProperty("signatureHash");
    expect(serialized).not.toHaveProperty("generatedBy");
    expect(serialized).not.toHaveProperty("snapshot");
  });

  it("returns null for missing receipts", () => {
    expect(serializeReceipt(null)).toBeNull();
  });
});
