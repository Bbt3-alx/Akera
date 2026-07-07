export type ReconciliationSeverity = 'info' | 'warning' | 'critical'

export type ReconciliationStatus = 'open' | 'resolved'

export type ReconciliationWorkflowType =
  | 'transaction'
  | 'payment'
  | 'receipt'
  | 'company_cash'
  | 'account_operation'
  | 'correspondent_collection'
  | 'correspondent_delivery'
  | 'remote_agent_payout'

export type ReconciliationSourceRef = {
  collectionName: string
  documentId: string
  code?: string
}

export type ReconciliationIssue = {
  id: string
  company: string
  workflowType: ReconciliationWorkflowType
  issueType: string
  severity: ReconciliationSeverity
  status: ReconciliationStatus
  sourceRefs: ReconciliationSourceRef[]
  expectedAmount: number | null
  actualAmount: number | null
  currency: 'FCFA' | 'GNF' | 'XOF' | null
  difference: number | null
  referenceCode?: string
  detectedAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNote?: string
  createdAt?: string
  updatedAt?: string
}

export type ReconciliationFilters = {
  from?: string
  limit?: number
  page?: number
  search?: string
  severity?: '' | ReconciliationSeverity
  status?: '' | ReconciliationStatus
  to?: string
  workflowType?: '' | ReconciliationWorkflowType
}

export type ReconciliationIssueList = {
  issues: ReconciliationIssue[]
  pagination: {
    limit: number
    page: number
    pages: number
    total: number
  }
  summary: {
    critical: number
    open: number
    resolved: number
  }
}

export type ReconciliationScanPayload = {
  from?: string
  to?: string
}

export type ReconciliationScanResult = {
  created: number
  detectedAt: string
  open: number
  scanned: Record<string, number>
}

export type ResolveReconciliationIssuePayload = {
  issueId: string
  note: string
}
