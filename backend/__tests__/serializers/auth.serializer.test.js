import mongoose from "mongoose";
import { describe, expect, it } from "@jest/globals";

import { serializeMembership } from "../../serializers/auth.serializer.js";

describe("auth serializer", () => {
  it("includes company business type and enabled modules on active memberships", () => {
    const companyId = new mongoose.Types.ObjectId();

    expect(
      serializeMembership({
        _id: new mongoose.Types.ObjectId(),
        company: {
          _id: companyId,
          name: "Akera Gold",
          businessType: "mixed",
          enabledModules: ["transfers", "gold_trading"],
          transferWorkflows: [
            "correspondent_collection",
            "remote_agent_payout",
          ],
        },
        role: "manager",
        permissions: [],
        status: "active",
      }),
    ).toEqual(
      expect.objectContaining({
        company: {
          id: companyId,
          name: "Akera Gold",
          businessType: "mixed",
          enabledModules: ["transfers", "gold_trading"],
          transferWorkflows: [
            "correspondent_collection",
            "remote_agent_payout",
          ],
        },
        companyBusinessType: "mixed",
        companyEnabledModules: ["transfers", "gold_trading"],
        companyTransferWorkflows: [
          "correspondent_collection",
          "remote_agent_payout",
        ],
      }),
    );
  });
});
