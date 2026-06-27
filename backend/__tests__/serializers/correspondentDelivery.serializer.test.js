import { describe, expect, it } from "@jest/globals";

import {
  serializeCorrespondentDelivery,
} from "../../serializers/correspondentDelivery.serializer.js";

describe("correspondent delivery serializer", () => {
  it("returns safe fields with names, rate snapshots, and no sensitive metadata", () => {
    const result = serializeCorrespondentDelivery({
      _id: "delivery-1",
      correspondentMembership: {
        _id: "partner-membership-1",
        user: {
          _id: "partner-user-1",
          firstName: "Kalil",
          lastName: "Diallo",
          email: "kalil@example.com",
        },
      },
      createdBy: { _id: "manager-user-1", email: "manager@example.com" },
      confirmedBy: { _id: "partner-user-1", email: "kalil@example.com" },
      deliveryCode: "CDL-260627-ABCD",
      amount: 326000000,
      currency: "GNF",
      status: "confirmed",
      beneficiaryName: "Kallo",
      beneficiaryPhone: "+22470000000",
      note: "Kallo collects from Kalil",
      rateValue: 82000,
      rateBaseAmount: 5000,
      rateQuoteCurrency: "GNF",
      rateBaseCurrency: "FCFA",
      counterAmount: 20000000,
      counterCurrency: "FCFA",
      rateNote: "Kalil sold GNF to Abdoulaye",
      accountOperation: { _id: "operation-1", ledgerEntries: ["internal"] },
      idempotencyKey: "delivery-create-1",
      idempotencyPayload: { amount: 326000000 },
      transactionPin: "123456",
      auditMetadata: { ipAddress: "127.0.0.1" },
      confirmedAt: "2026-06-27T10:00:00.000Z",
      createdAt: "2026-06-27T09:00:00.000Z",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });

    expect(result).toEqual({
      id: "delivery-1",
      deliveryCode: "CDL-260627-ABCD",
      amount: 326000000,
      currency: "GNF",
      status: "confirmed",
      beneficiaryName: "Kallo",
      beneficiaryPhone: "+22470000000",
      note: "Kallo collects from Kalil",
      rateValue: 82000,
      rateBaseAmount: 5000,
      rateQuoteCurrency: "GNF",
      rateBaseCurrency: "FCFA",
      counterAmount: 20000000,
      counterCurrency: "FCFA",
      rateNote: "Kalil sold GNF to Abdoulaye",
      correspondentMembership: "partner-membership-1",
      correspondentName: "Kalil Diallo",
      correspondentEmail: "kalil@example.com",
      createdBy: "manager-user-1",
      createdByName: "manager@example.com",
      confirmedBy: "partner-user-1",
      confirmedByName: "kalil@example.com",
      canceledBy: undefined,
      canceledByName: null,
      accountOperation: "operation-1",
      createdAt: "2026-06-27T09:00:00.000Z",
      updatedAt: "2026-06-27T10:00:00.000Z",
      confirmedAt: "2026-06-27T10:00:00.000Z",
      canceledAt: undefined,
      cancelReason: undefined,
    });
    expect(JSON.stringify(result)).not.toContain("delivery-create-1");
    expect(JSON.stringify(result)).not.toContain("idempotencyPayload");
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(JSON.stringify(result)).not.toContain("ipAddress");
    expect(JSON.stringify(result)).not.toContain("internal");
  });
});
