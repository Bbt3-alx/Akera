import { describe, expect, it } from "@jest/globals";

import { normalizeCancelReason } from "../../controllers/transaction.controller.js";
import { ApiError } from "../../middlewares/errorHandler.js";

describe("transaction controller helpers", () => {
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
