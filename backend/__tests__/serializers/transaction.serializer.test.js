import { describe, expect, it } from "@jest/globals";

import {
  serializeTransaction,
  serializeTransactions,
} from "../../serializers/transaction.serializer.js";

describe("transaction serializer", () => {
  it("serializes transaction fields with safe partner display info", () => {
    const transaction = {
      _id: "tx-1",
      id: "tx-1",
      transactionCode: "AKR-000001",
      company: "company-1",
      membership: {
        _id: "membership-1",
        user: {
          _id: "user-1",
          firstName: "Awa",
          lastName: "Diallo",
          email: "awa@example.com",
          password: "secret",
          resetPasswordToken: "reset-token",
          verificationToken: "verify-token",
          transactionPinHash: "pin-hash",
        },
        balance: 1000000,
        permissions: ["transactions:read"],
        role: "partner",
      },
      inputAmount: 1000,
      inputCurrency: "FCFA",
      partnerAmount: 9000,
      partnerCurrency: "GNF",
      companyAmount: 1000,
      companyCurrency: "FCFA",
      exchangeRate: 9,
      beneficiaryName: "Mamadou Camara",
      description: "Payout",
      status: "pending",
      idempotencyKey: "idem-1",
      createdBy: "creator-1",
      processedBy: "manager-1",
      processedAt: "2026-06-11T10:00:00.000Z",
      canceledAt: null,
      cancelReason: "Duplicate",
      canceledBy: "manager-2",
      reversedAt: "2026-06-12T10:00:00.000Z",
      reversedBy: "manager-3",
      reversedReason: "Correction",
      archived: false,
      createdAt: "2026-06-11T09:00:00.000Z",
      updatedAt: "2026-06-11T10:30:00.000Z",
      __v: 0,
    };

    const serialized = serializeTransaction(transaction);

    expect(serialized).toEqual({
      _id: "tx-1",
      id: "tx-1",
      transactionCode: "AKR-000001",
      company: "company-1",
      membership: "membership-1",
      inputAmount: 1000,
      inputCurrency: "FCFA",
      partnerAmount: 9000,
      partnerCurrency: "GNF",
      companyAmount: 1000,
      companyCurrency: "FCFA",
      exchangeRate: 9,
      beneficiaryName: "Mamadou Camara",
      description: "Payout",
      status: "pending",
      idempotencyKey: "idem-1",
      createdBy: "creator-1",
      processedBy: "manager-1",
      processedAt: "2026-06-11T10:00:00.000Z",
      canceledAt: null,
      cancelReason: "Duplicate",
      canceledBy: "manager-2",
      reversedAt: "2026-06-12T10:00:00.000Z",
      reversedBy: "manager-3",
      reversedReason: "Correction",
      archived: false,
      createdAt: "2026-06-11T09:00:00.000Z",
      updatedAt: "2026-06-11T10:30:00.000Z",
      partner: {
        membershipId: "membership-1",
        userId: "user-1",
        name: "Awa Diallo",
        email: "awa@example.com",
      },
    });
    expect(serialized).not.toHaveProperty("__v");
    expect(serialized.partner).not.toHaveProperty("balance");
    expect(serialized.partner).not.toHaveProperty("permissions");
    expect(serialized.partner).not.toHaveProperty("password");
    expect(serialized.partner).not.toHaveProperty("transactionPinHash");
  });

  it("returns null partner info when membership user is not populated", () => {
    const serialized = serializeTransaction({
      _id: "tx-2",
      membership: "membership-2",
    });

    expect(serialized.membership).toBe("membership-2");
    expect(serialized.partner).toBeNull();
  });

  it("serializes lists", () => {
    expect(
      serializeTransactions([
        { _id: "tx-1", membership: "membership-1" },
        { _id: "tx-2", membership: "membership-2" },
      ]),
    ).toHaveLength(2);
  });
});
