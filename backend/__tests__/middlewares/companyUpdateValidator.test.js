import { afterEach, describe, expect, it, jest } from "@jest/globals";

import Company from "../../models/Company.js";
import { validateCompanyUpdate } from "../../middlewares/validators.js";

describe("validateCompanyUpdate", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects direct company balance updates", async () => {
    const req = {
      body: {
        balance: 100000,
      },
      params: {
        id: "64f000000000000000000001",
      },
    };
    const res = createResponse();
    const next = jest.fn();
    const findOne = jest.spyOn(Company, "findOne").mockResolvedValue(null);

    await validateCompanyUpdate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 400,
      message: "Invalid fields: balance",
    });
    expect(next).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
  });
});

function createResponse() {
  return {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
}
