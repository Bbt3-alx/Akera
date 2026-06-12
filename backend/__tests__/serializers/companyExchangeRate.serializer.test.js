import mongoose from "mongoose";
import { describe, expect, it } from "@jest/globals";

import { serializeCompanyExchangeRate } from "../../serializers/companyExchangeRate.serializer.js";

describe("company exchange rate serializer", () => {
  it("serializes null exchange rates as null", () => {
    expect(serializeCompanyExchangeRate(null)).toBeNull();
  });

  it("serializes only safe company exchange rate fields", () => {
    const companyId = new mongoose.Types.ObjectId();
    const rateId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const createdAt = new Date("2026-06-12T10:00:00.000Z");
    const updatedAt = new Date("2026-06-12T10:15:00.000Z");

    const result = serializeCompanyExchangeRate({
      _id: rateId,
      company: companyId,
      rate: 85000,
      from: "FCFA",
      to: "GNF",
      setBy: {
        _id: userId,
        email: "manager@example.com",
        password: "secret",
      },
      createdAt,
      updatedAt,
      internalNotes: "do not expose",
    });

    expect(result).toEqual({
      id: rateId.toHexString(),
      company: companyId.toHexString(),
      rate: 85000,
      from: "FCFA",
      to: "GNF",
      setBy: userId.toHexString(),
      createdAt,
      updatedAt,
    });
  });
});
