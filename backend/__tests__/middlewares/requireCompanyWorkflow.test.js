import { describe, expect, it, jest } from "@jest/globals";

import { requireCompanyWorkflow } from "../../middlewares/requireCompanyWorkflow.js";

describe("requireCompanyWorkflow", () => {
  it("continues when the active company has the required workflow", () => {
    const guard = requireCompanyWorkflow("correspondent_collection");
    const next = jest.fn();

    guard(
      {
        context: {
          company: {
            transferWorkflows: ["correspondent_collection"],
          },
        },
      },
      {},
      next,
    );

    expect(next).toHaveBeenCalledWith();
    expect(guard.workflowName).toBe("correspondent_collection");
  });

  it("blocks when the active company is missing the required workflow", () => {
    const guard = requireCompanyWorkflow("correspondent_collection");
    const next = jest.fn();

    guard(
      {
        context: {
          company: {
            transferWorkflows: ["remote_agent_payout"],
          },
        },
      },
      {},
      next,
    );

    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      errorCode: "WORKFLOW_NOT_ENABLED",
      details: { workflowName: "correspondent_collection" },
    });
  });
});
