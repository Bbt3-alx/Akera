import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import ReconciliationIssue from "../../models/ReconciliationIssue.js";

describe("ReconciliationIssue model", () => {
  it("validates an open critical transaction issue", async () => {
    const issue = new ReconciliationIssue({
      company: new mongoose.Types.ObjectId(),
      workflowType: "transaction",
      issueType: "paid_transaction_missing_receipt",
      severity: "critical",
      status: "open",
      sourceRefs: [
        {
          collectionName: "Transaction",
          documentId: new mongoose.Types.ObjectId(),
          code: "TRX-001",
        },
      ],
      expectedAmount: 10000,
      actualAmount: 0,
      currency: "FCFA",
      difference: 10000,
      referenceCode: "TRX-001",
    });

    await expect(issue.validate()).resolves.toBeUndefined();
  });

  it("has lookup and duplicate-prevention indexes", () => {
    expect(ReconciliationIssue.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          {
            company: 1,
            status: 1,
            severity: 1,
            workflowType: 1,
            detectedAt: -1,
          },
          {},
        ],
        [
          {
            company: 1,
            issueType: 1,
            sourceKey: 1,
            status: 1,
          },
          {
            unique: true,
            partialFilterExpression: {
              status: "open",
            },
          },
        ],
      ]),
    );
  });
});
