export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'CANCEL'
  | 'STATUS_CHANGE'
  | 'RESTORE'
  | 'TRANSACTION_CREATE'
  | 'TRANSACTION_PAY'
  | 'TRANSACTION_CANCEL'
  | 'TRANSACTION_REVERSE'
  | 'SECURITY_TRANSACTION_PIN_SETUP'
  | 'SECURITY_TRANSACTION_PIN_CHANGE'
  | 'COMPANY_CASH_DEPOSIT'
  | 'ACCOUNT_OPERATION_COLLECTION_DEPOSIT'
  | 'ACCOUNT_OPERATION_WITHDRAWAL_REQUEST'
  | 'ACCOUNT_OPERATION_CONFIRM'
  | 'ACCOUNT_OPERATION_REJECT'
  | 'CORRESPONDENT_COLLECTION_CREATE'
  | 'CORRESPONDENT_COLLECTION_CONFIRM'
  | 'CORRESPONDENT_COLLECTION_PAY'
  | 'CORRESPONDENT_COLLECTION_CANCEL'
  | 'CORRESPONDENT_DELIVERY_CREATE'
  | 'CORRESPONDENT_DELIVERY_CONFIRM'
  | 'CORRESPONDENT_DELIVERY_CANCEL'
  | 'REMOTE_AGENT_PAYOUT_CREATE'
  | 'REMOTE_AGENT_AGENT_DEPOSIT'
  | 'REMOTE_AGENT_PAYOUT_PAY'
  | 'REMOTE_AGENT_PAYOUT_CANCEL'
  | 'REMOTE_AGENT_GROUP_CREATE'
  | 'REMOTE_AGENT_GROUP_UPDATE'
  | 'REMOTE_AGENT_GROUP_MEMBER_ADD'
  | 'REMOTE_AGENT_GROUP_MEMBER_UPDATE'
  | 'RECONCILIATION_SCAN'
  | 'RECONCILIATION_ISSUE_RESOLVE'
  | string

export type AuditTimelineActor = {
  email: string | null
  id: string | null
  name: string | null
}

export type AuditTimelineEvent = {
  action: AuditAction
  actionLabel: string
  actor: AuditTimelineActor
  category: string
  changes?: unknown
  collectionName: string
  details?: unknown
  id: string
  occurredAt: string
  targetCode?: string
  targetId: string
}

export type AuditTimelineFilters = {
  action?: string
  collectionName?: string
  from?: string
  limit?: number
  page?: number
  search?: string
  to?: string
}

export type AuditTimelineList = {
  logs: AuditTimelineEvent[]
  pagination: {
    limit: number
    page: number
    pages: number
    total: number
  }
  summary: {
    security: number
    today: number
    total: number
  }
}
