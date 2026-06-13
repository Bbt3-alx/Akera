import { describe, expect, it } from "@jest/globals";

import Transaction from "../../models/Transaction.js";

describe("Transaction model", () => {
  it("does not define the legacy partner field or partner compound index", () => {
    const indexFields = Transaction.schema.indexes().map(([fields]) => fields);

    expect(Transaction.schema.path("partner")).toBeUndefined();
    expect(indexFields).not.toContainEqual({ company: 1, partner: 1 });
  });

  it("does not keep restore-only metadata after legacy restore was disabled", () => {
    expect(Transaction.schema.path("restoredBy")).toBeUndefined();
  });
});
