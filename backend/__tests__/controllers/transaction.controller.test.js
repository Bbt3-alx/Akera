import { describe, expect, it } from "@jest/globals";

import {
  normalizeCancelReason,
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
});
