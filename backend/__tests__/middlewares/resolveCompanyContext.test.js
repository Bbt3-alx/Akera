import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import CompanyMembership from "../../models/CompanyMembership.js";
import resolveCompanyContext from "../../middlewares/resolveCompanyContext.js";

describe("resolveCompanyContext", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("adds safe company module metadata to the request context", async () => {
    const ids = createIds();
    jest.spyOn(CompanyMembership, "findOne").mockReturnValue(
      createMembershipQuery({
        _id: ids.membershipId,
        company: {
          _id: ids.companyId,
          name: "Akera Trading",
          businessType: "gold_trading",
          enabledModules: ["gold_trading", "company_cash"],
          transferWorkflows: ["remote_agent_payout"],
        },
        role: "manager",
        permissions: [],
      }),
    );
    const req = {
      headers: {
        "x-company-id": ids.companyId.toHexString(),
      },
      user: {
        id: ids.userId,
      },
    };
    const next = jest.fn();

    await resolveCompanyContext(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.context.company).toEqual({
      id: ids.companyId,
      name: "Akera Trading",
      businessType: "gold_trading",
      enabledModules: ["gold_trading", "company_cash"],
      transferWorkflows: ["remote_agent_payout"],
    });
  });
});

function createMembershipQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    populate: jest.fn().mockReturnThis(),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    membershipId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
  };
}
