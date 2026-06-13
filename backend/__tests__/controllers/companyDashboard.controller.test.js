import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { getDashboard } from "../../controllers/companyDashboard.controller.js";
import * as dashboardService from "../../services/dashboard.service.js";

describe("company dashboard controller", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes active company membership context to the dashboard service", async () => {
    const dashboardData = {
      company: { id: "company-1", name: "Akera Gold", baseCurrency: "FCFA" },
    };
    const getCompanyDashboard = jest
      .spyOn(dashboardService, "getCompanyDashboard")
      .mockResolvedValue(dashboardData);
    const res = createResponse();

    await getDashboard(
      {
        context: {
          companyId: "company-1",
          membershipId: "membership-1",
          role: "partner",
        },
        user: {
          id: "user-1",
        },
      },
      res,
    );

    expect(getCompanyDashboard).toHaveBeenCalledWith({
      companyId: "company-1",
      membershipId: "membership-1",
      userId: "user-1",
      role: "partner",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: dashboardData,
    });
  });
});

function createResponse() {
  const res = {
    json: jest.fn(() => res),
    status: jest.fn(() => res),
  };

  return res;
}
