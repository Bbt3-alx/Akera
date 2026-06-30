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

import {
  CorrespondentCollectionPage,
  WithdrawalSuccessCard,
} from './CorrespondentCollectionPage.tsx'

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

  it('orders partner transaction fields for mobile and desktop priority', () => {
    const html = renderPage()

    expectInOrder(html, [
      'Nom bénéficiaire',
      'Téléphone bénéficiaire',
      'Montant reçu en GNF',
      'Montant à payer au bénéficiaire',
      'Taux actuel',
      'Note',
      'PIN de transaction',
    ])
    expect(html).toContain('data-correspondent-form-column="primary"')
    expect(html).toContain('data-correspondent-form-column="secondary"')
    expect(html).toContain('md:col-start-1 md:row-start-1')
    expect(html).toContain('md:col-start-1 md:row-start-2')
    expect(html).toContain('md:col-start-1 md:row-start-3')
    expect(html).toContain('md:col-start-1 md:row-start-4')
    expect(html).toContain('md:col-start-2 md:row-start-1')
    expect(html).toContain('md:col-start-2 md:row-start-2')
    expect(html).toContain('md:col-start-2 md:row-start-3')
    expect(html).toContain('md:col-start-2 md:row-start-4')
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

  it('shows payout amount as primary and held funds as secondary in transaction cards', () => {
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [createMembership('manager')],
      },
      isLoading: false,
    })
    mocks.useCorrespondentTransactions.mockReturnValue({
      data: {
        data: [
          createTransaction({ status: 'pending' }),
          createTransaction({
            id: 'tx-2',
            collectionCode: 'CCL-PAID',
            status: 'paid',
          }),
          createTransaction({
            id: 'tx-3',
            collectionCode: 'CCL-CANCELED',
            status: 'canceled',
          }),
        ],
      },
      error: null,
      isLoading: false,
    })

    const html = renderPage('/app/correspondent-collections?tab=transactions')

    expect(html).toContain('Montant à payer')
    expect(html).toContain('Fonds détenus')
    expectInOrder(html, [
      'Montant à payer',
      '20',
      '000',
      '000 FCFA',
      'Fonds détenus',
      '328',
      '000',
      '000 GNF',
    ])
    expect(html).toContain(
      'Fonds reçus par le correspondant, bénéficiaire pas encore payé.',
    )
    expect(html).toContain(
      'Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.',
    )
    expect(html).toContain(
      'Transaction annulée. L’effet sur le solde correspondant a été reversé.',
    )
    expect(html).not.toMatch(/payoutAmount|payoutCurrency|amount|currency/)
  })

  it('shows payout amount first and contextual status message in pay-by-code', () => {
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [createMembership('manager')],
      },
      isLoading: false,
    })
    mocks.useCorrespondentTransaction.mockReturnValue({
      data: createTransaction({
        rateValue: 82000,
        rateBaseAmount: 5000,
        status: 'paid',
      }),
      error: null,
      isFetching: false,
    })

    const html = renderPage('/app/correspondent-collections?tab=pay-by-code')

    expectInOrder(html, [
      'Montant à payer',
      '20',
      '000',
      '000 FCFA',
      'Fonds détenus',
      '328',
      '000',
      '000 GNF',
    ])
    expect(html).toContain('Taux utilisé')
    expect(html).toContain(
      'Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.',
    )
    expect(html).not.toContain('Confirmer le paiement')
  })

  it('does not show the withdrawal amount integer error on initial render', () => {
    mocks.useMe.mockReturnValue({
      data: {
        memberships: [createMembership('manager')],
      },
      isLoading: false,
    })

    const html = renderPage('/app/correspondent-collections?tab=create-withdrawal')

    expect(html).toContain('Montant à retirer')
    expect(html).not.toContain('Le montant doit être un nombre entier FCFA/GNF.')
  })

  it('renders withdrawal creation success confirmation without backend terminology', () => {
    const html = renderToString(
      <WithdrawalSuccessCard
        correspondent={createCorrespondent()}
        withdrawal={createWithdrawal()}
      />,
    )

    expect(html).toContain(
      'Retrait créé. Le montant est maintenant réservé chez le correspondant en attente de confirmation.',
    )
    expect(html).toContain('Code retrait')
    expect(html).toContain('CDL-260627-ABCD')
    expect(html).toContain('Correspondant')
    expect(html).toContain('Kalil Diallo')
    expect(html).toContain('Bénéficiaire')
    expect(html).toContain('Kallo')
    expect(html).toContain('Montant à retirer')
    expect(html).toContain('326')
    expect(html).toContain('000')
    expect(html).toContain('000 GNF')
    expect(html).toContain('Retrait en attente')
    expect(html).not.toMatch(/delivery|Livraison|membership/i)
  })
})

function renderPage(initialEntry = '/app/correspondent-collections') {
  return renderToString(
    <MemoryRouter initialEntries={[initialEntry]}>
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
    currency: 'GNF' as const,
    balance: 328000000,
    reservedBalance: 2000000,
    availableBalance: 326000000,
    status: 'active' as const,
    ...override,
  }
}

function createTransaction(override = {}) {
  return {
    id: 'tx-1',
    collectionCode: 'CCL-260627-ABCD',
    amount: 328000000,
    currency: 'GNF' as const,
    payoutAmount: 20000000,
    payoutCurrency: 'FCFA' as const,
    beneficiaryName: 'Kadidia',
    beneficiaryPhone: '+22370000000',
    status: 'pending' as const,
    correspondentMembership: 'partner-membership-1',
    correspondentName: 'Kalil Diallo',
    correspondentEmail: 'kalil@example.com',
    createdAt: '2026-06-27T10:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
    ...override,
  }
}

function createWithdrawal(override = {}) {
  return {
    id: 'wd-1',
    deliveryCode: 'CDL-260627-ABCD',
    amount: 326000000,
    currency: 'GNF' as const,
    beneficiaryName: 'Kallo',
    beneficiaryPhone: '+22371000000',
    status: 'pending' as const,
    correspondentMembership: 'partner-membership-1',
    correspondentName: 'Kalil Diallo',
    correspondentEmail: 'kalil@example.com',
    createdAt: '2026-06-27T11:00:00.000Z',
    updatedAt: '2026-06-27T11:00:00.000Z',
    ...override,
  }
}

function expectInOrder(html: string, fragments: string[]) {
  let cursor = -1

  for (const fragment of fragments) {
    const next = html.indexOf(fragment, cursor + 1)
    expect(next, `${fragment} should appear after index ${cursor}`).toBeGreaterThan(
      cursor,
    )
    cursor = next
  }
}
