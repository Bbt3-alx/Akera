import { readFileSync } from "node:fs";

import { describe, expect, it } from "@jest/globals";

describe("correspondent collection domain docs", () => {
  it("documents correspondent-held funds and current limitations", () => {
    const docs = readFileSync(
      "docs/domain/correspondent-collection.md",
      "utf8",
    );

    expect(docs).toContain(
      "Positive correspondent balance means funds held by the correspondent for the company.",
    );
    expect(docs).toContain(
      "PARTNER_BALANCE means funds held by the correspondent for the company",
    );
    expect(docs).toContain(
      "One CompanyMembership has one currency balance.",
    );
    expect(docs).toContain("Company.balance is not mutated");
    expect(docs).toContain("transactionCode is the manager pay-by-code handle");
    expect(docs).toContain("TX-########");
    expect(docs).toContain(
      "A pending collection increases the correspondent balance immediately at creation",
    );
    expect(docs).toContain(
      "it does not credit the correspondent balance a second time",
    );
    expect(docs).toContain(
      "Canceling a pending collection reverses the creation balance effect",
    );
    expect(docs).toContain("amount/currency represent held funds");
    expect(docs).toContain("payoutAmount/payoutCurrency represent beneficiary payout");
    expect(docs).toContain("beneficiaryName and beneficiaryPhone");
    expect(docs).toContain("No customer debt or order model exists yet");
  });
});
