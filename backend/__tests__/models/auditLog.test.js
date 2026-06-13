import { describe, expect, it } from "@jest/globals";

import AuditLog from "../../models/AuditLog.js";

describe("AuditLog model", () => {
  it("allows transaction PIN security audit actions", () => {
    expect(AuditLog.schema.path("action").enumValues).toEqual(
      expect.arrayContaining([
        "SECURITY_TRANSACTION_PIN_SETUP",
        "SECURITY_TRANSACTION_PIN_CHANGE",
      ]),
    );
  });
});
