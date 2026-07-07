import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '../../shared/api/http.ts'
import {
  listReconciliationIssues,
  resolveReconciliationIssue,
  scanReconciliation,
} from './api.ts'

describe('reconciliation API helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the scan endpoint with an optional date range', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue({
      success: true,
      data: {
        created: 2,
        open: 5,
        scanned: { transactions: 3 },
        detectedAt: '2026-01-31T00:00:00.000Z',
      },
    })

    await scanReconciliation({ from: '2026-01-01', to: '2026-01-31' })

    expect(post).toHaveBeenCalledWith('/reconciliation/scan', {
      from: '2026-01-01',
      to: '2026-01-31',
    })
  })

  it('serializes issue filters as query params', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: {
        issues: [],
        pagination: { page: 1, limit: 25, total: 0, pages: 0 },
        summary: { open: 0, resolved: 0, critical: 0 },
      },
    })

    await listReconciliationIssues({
      status: 'open',
      severity: 'critical',
      workflowType: 'transaction',
      search: 'TRX',
      page: 2,
      limit: 10,
    })

    expect(get).toHaveBeenCalledWith('/reconciliation/issues', {
      params: {
        status: 'open',
        severity: 'critical',
        workflowType: 'transaction',
        search: 'TRX',
        page: 2,
        limit: 10,
      },
    })
  })

  it('calls the issue resolve endpoint with a note', async () => {
    const patch = vi.spyOn(http, 'patch').mockResolvedValue({
      success: true,
      data: createIssue(),
    })

    await resolveReconciliationIssue({
      issueId: 'issue-1',
      note: 'Matched with manual receipt.',
    })

    expect(patch).toHaveBeenCalledWith(
      '/reconciliation/issues/issue-1/resolve',
      { note: 'Matched with manual receipt.' },
    )
  })
})

function createIssue() {
  return {
    id: 'issue-1',
    company: 'company-1',
    workflowType: 'transaction',
    issueType: 'paid_transaction_missing_receipt',
    severity: 'critical',
    status: 'open',
    sourceRefs: [],
    expectedAmount: 1000,
    actualAmount: 0,
    currency: 'FCFA',
    difference: 1000,
    referenceCode: 'TRX-001',
    detectedAt: '2026-01-01T00:00:00.000Z',
  }
}
