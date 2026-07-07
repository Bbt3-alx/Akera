export function serializeReconciliationIssue(issue) {
  if (!issue) {
    return null;
  }

  return {
    id: serializeId(issue._id ?? issue.id),
    company: serializeId(issue.company),
    workflowType: issue.workflowType,
    issueType: issue.issueType,
    severity: issue.severity,
    status: issue.status,
    sourceRefs: Array.isArray(issue.sourceRefs)
      ? issue.sourceRefs.map((source) => ({
          collectionName: source.collectionName,
          documentId: serializeId(source.documentId),
          code: source.code,
        }))
      : [],
    expectedAmount: issue.expectedAmount,
    actualAmount: issue.actualAmount,
    currency: issue.currency,
    difference: issue.difference,
    referenceCode: issue.referenceCode,
    detectedAt: issue.detectedAt,
    resolvedAt: issue.resolvedAt,
    resolvedBy: serializeId(issue.resolvedBy),
    resolutionNote: issue.resolutionNote,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

export function serializeReconciliationIssueList(result) {
  return {
    issues: result.issues.map(serializeReconciliationIssue),
    pagination: result.pagination,
    summary: result.summary,
  };
}

function serializeId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (typeof value === "object") {
    return serializeId(value._id ?? value.id);
  }

  return value.toString();
}
