import { describe, expect, it, jest } from "@jest/globals";

import { finalizeReversedTransaction } from "../../services/transaction.service.js";

describe("transaction service helpers", () => {
  describe("finalizeReversedTransaction", () => {
    it("persists reversedReason and not legacy reverseReason", async () => {
      const reversedAt = new Date("2026-06-12T12:00:00.000Z");
      const transaction = {
        save: jest.fn().mockResolvedValue(undefined),
      };

      const result = await finalizeReversedTransaction({
        managerId: "manager-1",
        now: reversedAt,
        reason: "Manager correction",
        session: "session-1",
        transaction,
      });

      expect(result).toBe(transaction);
      expect(transaction.status).toBe("reversed");
      expect(transaction.reversedAt).toBe(reversedAt);
      expect(transaction.reversedBy).toBe("manager-1");
      expect(transaction.reversedReason).toBe("Manager correction");
      expect(transaction).not.toHaveProperty("reverseReason");
      expect(transaction.save).toHaveBeenCalledWith({ session: "session-1" });
    });
  });
});
