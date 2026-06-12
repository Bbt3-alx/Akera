import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import CompanyExchangeRate from "../../models/CompanyExchangeRate.js";
import {
  getCurrentCompanyExchangeRate,
  upsertCompanyExchangeRate,
} from "../../services/companyExchangeRate.service.js";

describe("company exchange rate service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null when the active company has no configured rate", async () => {
    const ids = createIds();
    const findOne = jest
      .spyOn(CompanyExchangeRate, "findOne")
      .mockReturnValue(createLeanQuery(null));

    const result = await getCurrentCompanyExchangeRate({
      companyId: ids.companyId,
    });

    expect(result).toBeNull();
    expect(findOne).toHaveBeenCalledWith({ company: ids.companyId });
  });

  it("lets a manager upsert a valid rate for the active company", async () => {
    const ids = createIds();
    const exchangeRate = createExchangeRate(ids);
    const findOneAndUpdate = jest
      .spyOn(CompanyExchangeRate, "findOneAndUpdate")
      .mockReturnValue(createLeanQuery(exchangeRate));

    const result = await upsertCompanyExchangeRate({
      companyId: ids.companyId,
      userId: ids.managerId,
      role: "manager",
      payload: { rate: 85000 },
    });

    expect(result).toBe(exchangeRate);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { company: ids.companyId },
      {
        $set: {
          rate: 85000,
          from: "FCFA",
          to: "GNF",
          setBy: ids.managerId,
        },
      },
      {
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      },
    );
  });

  it("does not allow non-managers to upsert the rate", async () => {
    const ids = createIds();
    const findOneAndUpdate = jest.spyOn(CompanyExchangeRate, "findOneAndUpdate");

    await expect(
      upsertCompanyExchangeRate({
        companyId: ids.companyId,
        userId: ids.partnerId,
        role: "partner",
        payload: { rate: 85000 },
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "EXCHANGE_RATE_MANAGER_REQUIRED",
    });

    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", {}],
    ["zero", { rate: 0 }],
    ["negative", { rate: -1 }],
    ["not finite", { rate: Number.POSITIVE_INFINITY }],
    ["not numeric", { rate: "abc" }],
  ])("rejects an invalid %s rate", async (_label, payload) => {
    const ids = createIds();
    const findOneAndUpdate = jest.spyOn(CompanyExchangeRate, "findOneAndUpdate");

    await expect(
      upsertCompanyExchangeRate({
        companyId: ids.companyId,
        userId: ids.managerId,
        role: "manager",
        payload,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_EXCHANGE_RATE",
    });

    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});

function createLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    partnerId: new mongoose.Types.ObjectId(),
    rateId: new mongoose.Types.ObjectId(),
  };
}

function createExchangeRate({
  companyId,
  managerId,
  rateId,
}) {
  return {
    _id: rateId,
    company: companyId,
    rate: 85000,
    from: "FCFA",
    to: "GNF",
    setBy: managerId,
    createdAt: new Date("2026-06-12T10:00:00.000Z"),
    updatedAt: new Date("2026-06-12T10:15:00.000Z"),
  };
}
