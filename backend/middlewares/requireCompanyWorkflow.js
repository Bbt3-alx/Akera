import { ApiError } from "./errorHandler.js";

export function requireCompanyWorkflow(workflowName) {
  function companyWorkflowGuard(req, res, next) {
    const workflows = req.context?.company?.transferWorkflows;

    if (!Array.isArray(workflows) || !workflows.includes(workflowName)) {
      return next(
        new ApiError(
          403,
          "This workflow is not enabled for the active company",
          "WORKFLOW_NOT_ENABLED",
          { workflowName },
        ),
      );
    }

    return next();
  }

  companyWorkflowGuard.workflowName = workflowName;

  return companyWorkflowGuard;
}
