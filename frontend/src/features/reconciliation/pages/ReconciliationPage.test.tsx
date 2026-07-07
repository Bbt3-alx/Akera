import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activeCompanyId: 'company-1',
  resolveIssue: vi.fn(),
  scan: vi.fn(),
  useReconciliationIssues: vi.fn(),
  useResolveReconciliationIssue: vi.fn(),
  useScanReconciliation: vi.fn(),
}))

vi.mock('../../companies/store.ts', () => ({
  useCompaniesStore: (
    selector: (state: { activeCompanyId: string | null }) => unknown,
  ) => selector({ activeCompanyId: mocks.activeCompanyId }),
}))

vi.mock('../hooks.ts', () => ({
  useReconciliationIssues: mocks.useReconciliationIssues,
  useResolveReconciliationIssue: mocks.useResolveReconciliationIssue,
  useScanReconciliation: mocks.useScanReconciliation,
}))

import { ReconciliationPage } from './ReconciliationPage.tsx'

describe('ReconciliationPage', () => {
  beforeEach(() => {
    mocks.activeCompanyId = 'company-1'
    mocks.scan = vi.fn()
    mocks.resolveIssue = vi.fn()
    mocks.useScanReconciliation.mockReturnValue({
      isPending: false,
      mutate: mocks.scan,
    })
    mocks.useResolveReconciliationIssue.mockReturnValue({
      isPending: false,
      mutate: mocks.resolveIssue,
    })
    mocks.useReconciliationIssues.mockReturnValue({
      data: {
        issues: [createIssue()],
        pagination: { page: 1, limit: 25, total: 1, pages: 1 },
        summary: { open: 1, resolved: 0, critical: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  it('renders summary cards, filters, and issue rows', () => {
    const html = renderToString(<ReconciliationPage />)

    expect(html).toContain('Reconciliation')
    expect(html).toContain('Open issues')
    expect(html).toContain('Critical')
    expect(html).toContain('Resolved')
    expect(html).toContain('Run scan')
    expect(html).toContain('TRX-001')
    expect(html).toContain('Paid transaction missing receipt')
    expect(html).toContain('Resolve')
  })

  it('shows first-scan empty state when no issues exist', () => {
    mocks.useReconciliationIssues.mockReturnValue({
      data: {
        issues: [],
        pagination: { page: 1, limit: 25, total: 0, pages: 0 },
        summary: { open: 0, resolved: 0, critical: 0 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    const html = renderToString(<ReconciliationPage />)

    expect(html).toContain('No reconciliation issues found for the current filters.')
    expect(html).toContain('Run scan')
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
    sourceRefs: [
      {
        collectionName: 'Transaction',
        documentId: 'transaction-1',
        code: 'TRX-001',
      },
    ],
    expectedAmount: 12500,
    actualAmount: 0,
    currency: 'FCFA',
    difference: 12500,
    referenceCode: 'TRX-001',
    detectedAt: '2026-01-01T00:00:00.000Z',
  }
}
