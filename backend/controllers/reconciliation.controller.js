import {
  listReconciliationIssues,
  resolveReconciliationIssue,
  scanCompanyReconciliation,
} from "../services/reconciliation.service.js";
import {
  serializeReconciliationIssue,
  serializeReconciliationIssueList,
} from "../serializers/reconciliation.serializer.js";

export const scanReconciliation = async (req, res) => {
  const result = await scanCompanyReconciliation({
    companyId: req.context.companyId,
    from: req.body?.from,
    to: req.body?.to,
  });

  res.locals.audit = {
    targetId: req.context.companyId,
    targetCode: req.context.company?.name,
    metadata: result,
  };

  res.status(201).json({
    success: true,
    data: result,
  });
};

export const getReconciliationIssues = async (req, res) => {
  const result = await listReconciliationIssues({
    companyId: req.context.companyId,
    filters: req.query,
    pagination: {
      page: req.query.page,
      limit: req.query.limit,
    },
  });

  res.status(200).json({
    success: true,
    data: serializeReconciliationIssueList(result),
  });
};

export const resolveIssue = async (req, res) => {
  const issue = await resolveReconciliationIssue({
    companyId: req.context.companyId,
    issueId: req.params.id,
    userId: req.user.id,
    note: req.body?.note,
  });

  res.locals.audit = {
    targetId: issue._id,
    targetCode: issue.referenceCode,
    metadata: {
      issueType: issue.issueType,
      workflowType: issue.workflowType,
      note: issue.resolutionNote,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeReconciliationIssue(issue),
  });
};
