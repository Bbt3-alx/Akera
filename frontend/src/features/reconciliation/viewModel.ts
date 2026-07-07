import type {
  ReconciliationFilters,
  ReconciliationSeverity,
  ReconciliationStatus,
  ReconciliationWorkflowType,
} from './types.ts'

const severityLabels: Record<ReconciliationSeverity, string> = {
  critical: 'Critical',
  info: 'Info',
  warning: 'Warning',
}

const statusLabels: Record<ReconciliationStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
}

const workflowLabels: Record<ReconciliationWorkflowType, string> = {
  account_operation: 'Account operation',
  company_cash: 'Company cash',
  correspondent_collection: 'Correspondent collection',
  correspondent_delivery: 'Correspondent delivery',
  payment: 'Payment',
  receipt: 'Receipt',
  remote_agent_payout: 'Remote agent payout',
  transaction: 'Transaction',
}

const issueTypeLabels: Record<string, string> = {
  correspondent_collection_missing_account_operation:
    'Correspondent collection missing account operation',
  inactive_transaction_has_active_payment:
    'Inactive transaction has active payment',
  paid_transaction_missing_receipt: 'Paid transaction missing receipt',
  payment_missing_receipt: 'Payment missing receipt',
  remote_agent_payout_missing_account_operation:
    'Remote agent payout missing account operation',
}

export function getSeverityLabel(value: ReconciliationSeverity): string {
  return severityLabels[value] ?? value
}

export function getStatusLabel(value: ReconciliationStatus): string {
  return statusLabels[value] ?? value
}

export function getWorkflowTypeLabel(
  value: ReconciliationWorkflowType,
): string {
  return workflowLabels[value] ?? value
}

export function getIssueTypeLabel(value: string): string {
  return issueTypeLabels[value] ?? sentenceCase(value)
}

export function formatReconciliationAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return '-'
  }

  return `${new Intl.NumberFormat('en-US').format(amount)} ${currency ?? ''}`.trim()
}

export function normalizeReconciliationFilters(
  filters: ReconciliationFilters,
): ReconciliationFilters {
  const normalized: ReconciliationFilters = {}

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        normalized[key as keyof ReconciliationFilters] = trimmed as never
      }
      continue
    }

    if (typeof value === 'number') {
      normalized[key as keyof ReconciliationFilters] = value as never
    }
  }

  return normalized
}

export function validateResolutionNote(note: string): string | null {
  const normalized = note.trim()

  if (!normalized) {
    return 'Resolution note is required.'
  }

  if (normalized.length > 500) {
    return 'Resolution note must be 500 characters or fewer.'
  }

  return null
}

function sentenceCase(value: string): string {
  const spaced = value.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
