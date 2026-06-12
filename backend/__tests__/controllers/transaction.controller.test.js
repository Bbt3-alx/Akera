import { describe, expect, it } from "@jest/globals";

import {
  normalizeCancelReason,
  normalizeReverseReason,
  serializeTransactionMutationResult,
} from "../../controllers/transaction.controller.js";
import { ApiError } from "../../middlewares/errorHandler.js";

describe("transaction controller helpers", () => {
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
