import { describe, expect, it } from 'vitest'

import {
  formatReconciliationAmount,
  getIssueTypeLabel,
  getSeverityLabel,
  getStatusLabel,
  getWorkflowTypeLabel,
  normalizeReconciliationFilters,
  validateResolutionNote,
} from './viewModel.ts'

describe('reconciliation view model', () => {
  it('formats labels for known issue dimensions', () => {
    expect(getSeverityLabel('critical')).toBe('Critical')
    expect(getStatusLabel('resolved')).toBe('Resolved')
    expect(getWorkflowTypeLabel('remote_agent_payout')).toBe('Remote agent payout')
    expect(getIssueTypeLabel('paid_transaction_missing_receipt')).toBe(
      'Paid transaction missing receipt',
    )
  })

  it('formats amounts with currency and fallback dash', () => {
    expect(formatReconciliationAmount(12500, 'FCFA')).toBe('12,500 FCFA')
    expect(formatReconciliationAmount(null, 'FCFA')).toBe('-')
  })

  it('removes empty filters before API calls', () => {
    expect(
      normalizeReconciliationFilters({
        status: 'open',
        severity: '',
        workflowType: undefined,
        search: '  TRX-001  ',
        page: 1,
        limit: 25,
      }),
    ).toEqual({
      status: 'open',
      search: 'TRX-001',
      page: 1,
      limit: 25,
    })
  })

  it('requires a resolution note', () => {
    expect(validateResolutionNote('')).toBe('Resolution note is required.')
    expect(validateResolutionNote('  matched manually  ')).toBeNull()
  })
})
