import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import CompanyExchangeRate from "../../models/CompanyExchangeRate.js";
import {
  getExchangeRate,
  updateExchangeRate,
} from "../../controllers/exchangeRateController.js";

describe("exchange rate controller", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns success with null data when no company rate is configured", async () => {
    const ids = createIds();
    jest
      .spyOn(CompanyExchangeRate, "findOne")
      .mockReturnValue(createLeanQuery(null));
    const res = createResponse();

    await getExchangeRate(
      {
        context: {
          companyId: ids.companyId,
          role: "partner",
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: null,
    });
  });

  it.each(["partner", "employee"])(
    "allows an active %s to read the current company rate",
    async (role) => {
      const ids = createIds();
      jest
        .spyOn(CompanyExchangeRate, "findOne")
        .mockReturnValue(createLeanQuery(createExchangeRate(ids)));
      const res = createResponse();

      await getExchangeRate(
        {
          context: {
            companyId: ids.companyId,
            role,
          },
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          company: ids.companyId.toHexString(),
          rate: 85000,
          from: "FCFA",
          to: "GNF",
          setBy: ids.managerId.toHexString(),
        }),
      });
    },
  );

  it("lets managers update the rate and returns a serialized response", async () => {
    const ids = createIds();
    jest
      .spyOn(CompanyExchangeRate, "findOneAndUpdate")
      .mockReturnValue(createLeanQuery(createExchangeRate(ids)));
    const res = createResponse();

    await updateExchangeRate(
      {
        body: { rate: 85000 },
        context: {
          companyId: ids.companyId,
          role: "manager",
        },
        user: {
          id: ids.managerId,
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        company: ids.companyId.toHexString(),
        rate: 85000,
        from: "FCFA",
        to: "GNF",
        setBy: ids.managerId.toHexString(),
      }),
    });
  });

  it("rejects non-manager updates", async () => {
    const ids = createIds();
    const res = createResponse();

    await expect(
      updateExchangeRate(
        {
          body: { rate: 85000 },
          context: {
            companyId: ids.companyId,
            role: "employee",
          },
          user: {
            id: ids.employeeId,
          },
        },
        res,
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "EXCHANGE_RATE_MANAGER_REQUIRED",
    });
  });
});

function createLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return res;
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    employeeId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
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
