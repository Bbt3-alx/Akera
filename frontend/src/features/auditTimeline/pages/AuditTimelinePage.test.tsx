import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activeCompanyId: 'company-1',
  refetch: vi.fn(),
  useAuditTimeline: vi.fn(),
  useMe: vi.fn(),
}))

vi.mock('../../companies/store.ts', () => ({
  useCompaniesStore: (
    selector: (state: { activeCompanyId: string | null }) => unknown,
  ) => selector({ activeCompanyId: mocks.activeCompanyId }),
}))

vi.mock('../../auth/hooks.ts', () => ({
  useMe: mocks.useMe,
}))

vi.mock('../hooks.ts', () => ({
  useAuditTimeline: mocks.useAuditTimeline,
}))

import { AuditTimelinePage } from './AuditTimelinePage.tsx'

describe('AuditTimelinePage', () => {
  beforeEach(() => {
    mocks.activeCompanyId = 'company-1'
    mocks.refetch = vi.fn()
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [
          {
            companyId: 'company-1',
            role: 'manager',
            status: 'active',
          },
        ],
      },
      isLoading: false,
    })
    mocks.useAuditTimeline.mockReturnValue({
      data: {
        logs: [createLog()],
        pagination: { page: 1, limit: 25, total: 1, pages: 1 },
        summary: { total: 1, today: 1, security: 0 },
      },
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: mocks.refetch,
    })
  })

  it('renders summary cards, filters, timeline cards, and selected detail panel', () => {
    const html = renderToString(<AuditTimelinePage />)

    expect(html).toContain('Audit timeline')
    expect(html).toContain('Visible events')
    expect(html).toContain('Today')
    expect(html).toContain('Security events')
    expect(html).toContain('All actions')
    expect(html).toContain('Transaction paid')
    expect(html).toContain('TRX-001')
    expect(html).toContain('Event details')
    expect(html).toContain('Status')
    expect(html).not.toContain('<table')
  })

  it('shows an empty state when no logs match the filters', () => {
    mocks.useAuditTimeline.mockReturnValue({
      data: {
        logs: [],
        pagination: { page: 1, limit: 25, total: 0, pages: 0 },
        summary: { total: 0, today: 0, security: 0 },
      },
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: mocks.refetch,
    })

    const html = renderToString(<AuditTimelinePage />)

    expect(html).toContain('No audit events found for the current filters.')
  })

  it('blocks non-manager memberships', () => {
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [
          {
            companyId: 'company-1',
            role: 'employee',
            status: 'active',
          },
        ],
      },
      isLoading: false,
    })

    const html = renderToString(<AuditTimelinePage />)

    expect(html).toContain('Audit timeline unavailable for this membership.')
  })
})

function createLog() {
  return {
    action: 'TRANSACTION_PAY',
    actionLabel: 'Transaction paid',
    actor: {
      email: 'manager@akera.test',
      id: 'user-1',
      name: 'Mariam Manager',
    },
    category: 'transactions',
    changes: {
      status: { from: 'pending', to: 'completed' },
    },
    collectionName: 'Transaction',
    details: {
      amount: 25000,
      currency: 'FCFA',
      status: 'completed',
    },
    id: 'log-1',
    occurredAt: '2026-07-07T10:00:00.000Z',
    targetCode: 'TRX-001',
    targetId: 'target-1',
  }
}
