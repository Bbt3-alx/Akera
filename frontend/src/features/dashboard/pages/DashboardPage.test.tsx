import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppApiError } from '../../../shared/api/types.ts'
import { DASHBOARD_CONNECTIVITY_ERROR_MESSAGE } from '../errorMessage.ts'
import type { Membership } from '../../auth/types.ts'

const mocks = vi.hoisted(() => ({
  activeCompanyId: 'company-1',
  useCorrespondents: vi.fn(),
  useCorrespondentTransactions: vi.fn(),
  useCorrespondentWithdrawals: vi.fn(),
  useCompanyDashboard: vi.fn(),
  useMe: vi.fn(),
  useTransactionPinStatus: vi.fn(),
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

vi.mock('../../correspondentCollection/hooks.ts', () => ({
  useCorrespondents: mocks.useCorrespondents,
  useCorrespondentTransactions: mocks.useCorrespondentTransactions,
  useCorrespondentWithdrawals: mocks.useCorrespondentWithdrawals,
}))

vi.mock('../../security/hooks.ts', () => ({
  useTransactionPinStatus: mocks.useTransactionPinStatus,
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
    mocks.useCorrespondents.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })
    mocks.useCorrespondentTransactions.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })
    mocks.useCorrespondentWithdrawals.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })
    mocks.useTransactionPinStatus.mockReturnValue({
      data: { configured: true },
      error: null,
      isLoading: false,
    })
  })

  it('shows a clear French connectivity error instead of staying on loading', () => {
    const html = renderToString(<DashboardPage />)

    expect(html).toContain('Unable to load dashboard')
    expect(html).toContain(DASHBOARD_CONNECTIVITY_ERROR_MESSAGE)
    expect(html).not.toContain('Loading dashboard')
    expect(html).not.toContain('Fetching your company dashboard')
  })

  it('shows correspondent partner dashboard metrics and quick actions', () => {
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [createCorrespondentMembership('partner')],
      },
    })
    mocks.useTransactionPinStatus.mockReturnValue({
      data: { configured: false },
      error: null,
      isLoading: false,
    })
    mocks.useCorrespondents.mockReturnValue({
      data: [
        {
          membershipId: 'partner-membership-1',
          name: 'Kalil Diallo',
          email: 'kalil@example.com',
          currency: 'GNF',
          balance: 328000000,
          reservedBalance: 2000000,
          availableBalance: 326000000,
          status: 'active',
        },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })
    mocks.useCorrespondentTransactions.mockReturnValue({
      data: {
        data: [
          createCorrespondentTransaction({ status: 'pending' }),
          createCorrespondentTransaction({
            id: 'tx-2',
            transactionCode: 'TX-99210453',
            status: 'paid',
          }),
        ],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })
    mocks.useCorrespondentWithdrawals.mockReturnValue({
      data: {
        data: [
          createCorrespondentWithdrawal({ status: 'pending' }),
          createCorrespondentWithdrawal({
            id: 'wd-2',
            deliveryCode: 'CDL-2',
            status: 'confirmed',
          }),
        ],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })

    const html = renderToString(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(html).toContain('Dashboard correspondants')
    expect(html).toContain('Mon solde détenu pour l’entreprise')
    expect(html).toContain('Mes transactions en attente')
    expect(html).toContain('Mes transactions payées')
    expect(html).toContain('Mes retraits en attente')
    expect(html).toContain('Mes retraits confirmés')
    expect(html).toContain('Créer une transaction')
    expect(html).toContain('Configurer mon PIN')
    expect(html).not.toContain('My transactions with this company')
    expect(html).not.toContain('New transaction')
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

function createCorrespondentMembership(role: Membership['role']): Membership {
  return {
    membershipId: `${role}-membership-1`,
    companyId: 'company-1',
    companyName: 'Akera',
    company: {
      id: 'company-1',
      name: 'Akera',
      businessType: 'transfer',
      transferWorkflows: ['correspondent_collection'],
      enabledModules: [
        'transfers',
        'correspondent_collections',
        'account_operations',
        'company_cash',
        'exchange_rate',
      ],
    },
    companyBusinessType: 'transfer',
    companyTransferWorkflows: ['correspondent_collection'],
    companyEnabledModules: [
      'transfers',
      'correspondent_collections',
      'account_operations',
      'company_cash',
      'exchange_rate',
    ],
    role,
    status: 'active',
    permissions: [],
  }
}

function createCorrespondentTransaction(override = {}) {
  return {
    id: 'tx-1',
    transactionCode: 'TX-99210452',
    amount: 328000000,
    currency: 'GNF',
    payoutAmount: 20000000,
    payoutCurrency: 'FCFA',
    beneficiaryName: 'Kadidia',
    status: 'pending',
    correspondentMembership: 'partner-membership-1',
    createdAt: '2026-06-27T10:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
    ...override,
  }
}

function createCorrespondentWithdrawal(override = {}) {
  return {
    id: 'wd-1',
    deliveryCode: 'CDL-1',
    amount: 2000000,
    currency: 'GNF',
    beneficiaryName: 'Kallo',
    status: 'pending',
    correspondentMembership: 'partner-membership-1',
    createdAt: '2026-06-27T11:00:00.000Z',
    updatedAt: '2026-06-27T11:00:00.000Z',
    ...override,
  }
}
