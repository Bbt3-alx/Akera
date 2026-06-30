import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activeCompanyId: 'company-1',
  useCancelCorrespondentTransaction: vi.fn(),
  useCancelCorrespondentWithdrawal: vi.fn(),
  useConfirmCorrespondentWithdrawal: vi.fn(),
  useCorrespondentTransaction: vi.fn(),
  useCorrespondentTransactions: vi.fn(),
  useCorrespondentWithdrawals: vi.fn(),
  useCorrespondents: vi.fn(),
  useCreateCorrespondentTransaction: vi.fn(),
  useCreateCorrespondentWithdrawal: vi.fn(),
  useCurrentExchangeRate: vi.fn(),
  useMe: vi.fn(),
  usePayCorrespondentTransactionByCode: vi.fn(),
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

vi.mock('../../exchangeRates/hooks.ts', () => ({
  useCurrentExchangeRate: mocks.useCurrentExchangeRate,
}))

vi.mock('../../security/hooks.ts', () => ({
  useTransactionPinStatus: mocks.useTransactionPinStatus,
}))

vi.mock('../hooks.ts', () => ({
  useCancelCorrespondentTransaction: mocks.useCancelCorrespondentTransaction,
  useCancelCorrespondentWithdrawal: mocks.useCancelCorrespondentWithdrawal,
  useConfirmCorrespondentWithdrawal: mocks.useConfirmCorrespondentWithdrawal,
  useCorrespondentTransaction: mocks.useCorrespondentTransaction,
  useCorrespondentTransactions: mocks.useCorrespondentTransactions,
  useCorrespondentWithdrawals: mocks.useCorrespondentWithdrawals,
  useCorrespondents: mocks.useCorrespondents,
  useCreateCorrespondentTransaction: mocks.useCreateCorrespondentTransaction,
  useCreateCorrespondentWithdrawal: mocks.useCreateCorrespondentWithdrawal,
  usePayCorrespondentTransactionByCode: mocks.usePayCorrespondentTransactionByCode,
}))

import { CorrespondentCollectionPage } from './CorrespondentCollectionPage.tsx'

describe('CorrespondentCollectionPage', () => {
  beforeEach(() => {
    mocks.activeCompanyId = 'company-1'
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [createMembership('partner')],
      },
      isLoading: false,
    })
    mocks.useCorrespondents.mockReturnValue({
      data: [createCorrespondent()],
      error: null,
      isLoading: false,
    })
    mocks.useCorrespondentTransactions.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
    })
    mocks.useCorrespondentWithdrawals.mockReturnValue({
      data: { data: [] },
      error: null,
      isLoading: false,
    })
    mocks.useCurrentExchangeRate.mockReturnValue({
      data: {
        id: 'rate-1',
        company: 'company-1',
        rate: 82000,
        from: 'FCFA',
        to: 'GNF',
        setBy: 'manager-1',
        createdAt: '2026-06-27T10:00:00.000Z',
        updatedAt: '2026-06-27T10:00:00.000Z',
      },
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    })
    mocks.useTransactionPinStatus.mockReturnValue({
      data: { configured: true },
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    })
    mocks.useCreateCorrespondentTransaction.mockReturnValue(createMutation())
    mocks.useCreateCorrespondentWithdrawal.mockReturnValue(createMutation())
    mocks.useCancelCorrespondentTransaction.mockReturnValue(createMutation())
    mocks.useCancelCorrespondentWithdrawal.mockReturnValue(createMutation())
    mocks.useConfirmCorrespondentWithdrawal.mockReturnValue(createMutation())
    mocks.usePayCorrespondentTransactionByCode.mockReturnValue(createMutation())
    mocks.useCorrespondentTransaction.mockReturnValue({
      data: null,
      error: null,
      isFetching: false,
    })
  })

  it('shows the transaction PIN setup CTA before partner transaction creation', () => {
    mocks.useTransactionPinStatus.mockReturnValue({
      data: { configured: false },
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    })

    const html = renderPage()

    expect(html).toContain('PIN de transaction requis')
    expect(html).toContain('Configurer mon PIN')
    expect(html).not.toContain('Montant reçu en GNF')
  })

  it('shows rate-driven payout information without editable rate fields', () => {
    const html = renderPage()

    expect(html).toContain('Taux actuel : 82')
    expect(html).toContain('000 GNF / 5')
    expect(html).toContain('000 FCFA')
    expect(html).toContain('Montant à payer au bénéficiaire')
    expect(html).toContain('Montant reçu en GNF')
    expect(html).not.toContain('Taux utilisé')
    expect(html).not.toContain('Base du taux')
    expect(html).not.toContain('Devise de paiement')
  })

  it('blocks FCFA correspondent transaction creation with the friendly message', () => {
    mocks.useCorrespondents.mockReturnValue({
      data: [createCorrespondent({ currency: 'FCFA' })],
      error: null,
      isLoading: false,
    })

    const html = renderPage()

    expect(html).toContain(
      'La création de transaction correspondant est disponible uniquement pour les correspondants en GNF pour le moment.',
    )
  })
})

function renderPage() {
  return renderToString(
    <MemoryRouter initialEntries={['/app/correspondent-collections']}>
      <CorrespondentCollectionPage />
    </MemoryRouter>,
  )
}

function createMutation() {
  return {
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  }
}

function createMembership(role: 'manager' | 'partner') {
  return {
    membershipId: `${role}-membership-1`,
    companyId: 'company-1',
    companyName: 'Akera',
    company: {
      id: 'company-1',
      name: 'Akera',
      businessType: 'transfer',
      transferWorkflows: ['correspondent_collection'],
      enabledModules: ['transfers', 'correspondent_collections', 'exchange_rate'],
    },
    companyBusinessType: 'transfer',
    companyTransferWorkflows: ['correspondent_collection'],
    companyEnabledModules: ['transfers', 'correspondent_collections', 'exchange_rate'],
    role,
    status: 'active',
    permissions: [],
  }
}

function createCorrespondent(override = {}) {
  return {
    membershipId: 'partner-membership-1',
    name: 'Kalil Diallo',
    email: 'kalil@example.com',
    currency: 'GNF',
    balance: 328000000,
    reservedBalance: 2000000,
    availableBalance: 326000000,
    status: 'active',
    ...override,
  }
}
