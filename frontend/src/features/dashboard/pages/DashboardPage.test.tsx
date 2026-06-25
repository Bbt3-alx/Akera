import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppApiError } from '../../../shared/api/types.ts'
import { DASHBOARD_CONNECTIVITY_ERROR_MESSAGE } from '../errorMessage.ts'
import type { Membership } from '../../auth/types.ts'

const mocks = vi.hoisted(() => ({
  activeCompanyId: 'company-1',
  useCompanyDashboard: vi.fn(),
  useMe: vi.fn(),
}))

vi.mock('../../auth/hooks.ts', () => ({
  useMe: mocks.useMe,
}))

vi.mock('../../companies/store.ts', () => ({
  useCompaniesStore: (
    selector: (state: { activeCompanyId: string | null }) => unknown,
  ) => selector({ activeCompanyId: mocks.activeCompanyId }),
}))

vi.mock('../hooks.ts', () => ({
  useCompanyDashboard: mocks.useCompanyDashboard,
}))

import { DashboardPage } from './DashboardPage.tsx'

describe('DashboardPage API error state', () => {
  beforeEach(() => {
    mocks.activeCompanyId = 'company-1'
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [createTransferMembership()],
      },
    })
    mocks.useCompanyDashboard.mockReturnValue({
      data: undefined,
      error: new AppApiError({
        message: 'Network Error',
        statusCode: 0,
      }),
      isError: true,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    })
  })

  it('shows a clear French connectivity error instead of staying on loading', () => {
    const html = renderToString(<DashboardPage />)

    expect(html).toContain('Unable to load dashboard')
    expect(html).toContain(DASHBOARD_CONNECTIVITY_ERROR_MESSAGE)
    expect(html).not.toContain('Loading dashboard')
    expect(html).not.toContain('Fetching your company dashboard')
  })
})

function createTransferMembership(): Membership {
  return {
    membershipId: 'membership-1',
    companyId: 'company-1',
    companyName: 'Akera',
    company: {
      id: 'company-1',
      name: 'Akera',
      businessType: 'transfer',
      transferWorkflows: ['correspondent_collection'],
      enabledModules: ['transfers', 'company_cash', 'exchange_rate'],
    },
    companyBusinessType: 'transfer',
    companyTransferWorkflows: ['correspondent_collection'],
    companyEnabledModules: ['transfers', 'company_cash', 'exchange_rate'],
    role: 'manager',
    status: 'active',
    permissions: [],
  }
}
