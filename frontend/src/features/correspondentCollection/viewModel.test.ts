import { describe, expect, it } from 'vitest'

import { AppApiError } from '../../shared/api/types.ts'
import {
  CORRESPONDENT_GNF_ONLY_MESSAGE,
  CORRESPONDENT_MANAGER_TABS,
  CORRESPONDENT_PARTNER_TABS,
  CORRESPONDENT_UI_TEXT,
  buildCorrespondentOverview,
  calculateCorrespondentPayoutPreview,
  formatCorrespondentAmount,
  formatCorrespondentRate,
  getAutoSelectedCorrespondentId,
  getCorrespondentErrorMessage,
  getCorrespondentVisibleIdentity,
  getTransactionStatusMessage,
  getTransactionStatusLabel,
  getWithdrawalStatusLabel,
  getWithdrawalWarning,
  parseCorrespondentAmountInput,
  resolveCorrespondentTab,
} from './viewModel.ts'
import type {
  CorrespondentSummary,
  CorrespondentTransaction,
  CorrespondentWithdrawal,
} from './types.ts'

describe('correspondent collection view model', () => {
  it('resolves manager and partner tabs with French field terminology', () => {
    expect(CORRESPONDENT_MANAGER_TABS.map((tab) => tab.label)).toEqual([
      'Vue d’ensemble',
      'Payer par code',
      'Transactions',
      'Faire un retrait',
      'Retraits',
    ])
    expect(CORRESPONDENT_PARTNER_TABS.map((tab) => tab.label)).toEqual([
      'Créer une transaction',
      'Mes transactions',
      'Mes retraits',
    ])
    expect(resolveCorrespondentTab('manager', 'withdrawals')).toBe('withdrawals')
    expect(resolveCorrespondentTab('manager', 'my-transactions')).toBe('overview')
    expect(resolveCorrespondentTab('partner', 'my-transactions')).toBe(
      'my-transactions',
    )
    expect(resolveCorrespondentTab('partner', 'pay-by-code')).toBe(
      'create-transaction',
    )
  })

  it('maps backend statuses to transaction and withdrawal labels', () => {
    expect(getTransactionStatusLabel('pending')).toBe('En attente de paiement')
    expect(getTransactionStatusLabel('paid')).toBe('Payée')
    expect(getTransactionStatusLabel('confirmed')).toBe('Payée')
    expect(getTransactionStatusLabel('canceled')).toBe('Annulée')
    expect(getWithdrawalStatusLabel('pending')).toBe('Retrait en attente')
    expect(getWithdrawalStatusLabel('confirmed')).toBe('Retrait confirmé')
    expect(getWithdrawalStatusLabel('canceled')).toBe('Annulé')
  })

  it('maps transaction statuses to contextual workflow messages', () => {
    expect(getTransactionStatusMessage('pending')).toBe(
      'Fonds reçus par le correspondant, bénéficiaire pas encore payé.',
    )
    expect(getTransactionStatusMessage('paid')).toBe(
      'Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.',
    )
    expect(getTransactionStatusMessage('confirmed')).toBe(
      'Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.',
    )
    expect(getTransactionStatusMessage('canceled')).toBe(
      'Transaction annulée. L’effet sur le solde correspondant a été reversé.',
    )
  })

  it('keeps user-facing terminology free of backend collection and delivery wording', () => {
    const visibleText = Object.values(CORRESPONDENT_UI_TEXT).join(' ')

    expect(visibleText).toContain('Transactions correspondants')
    expect(visibleText).toContain('Confirmer le retrait')
    expect(visibleText).not.toMatch(/collecte|livraison|collection|delivery/i)
  })

  it('parses and formats integer FCFA and GNF amounts', () => {
    expect(parseCorrespondentAmountInput('328 000 000')).toEqual({
      amount: 328000000,
      error: null,
    })
    expect(parseCorrespondentAmountInput('326.000.000')).toEqual({
      amount: 326000000,
      error: null,
    })
    expect(parseCorrespondentAmountInput('326000000.5')).toEqual({
      amount: null,
      error: 'Le montant doit être un nombre entier FCFA/GNF.',
    })
    expect(formatCorrespondentAmount(328000000, 'GNF')).toBe(
      '328\u202f000\u202f000 GNF',
    )
  })

  it('calculates partner payout preview with floor rounding from the manager rate', () => {
    expect(
      calculateCorrespondentPayoutPreview({
        receivedAmount: 328000001,
        rateValue: 82000,
      }),
    ).toBe(20000000)
    expect(
      formatCorrespondentRate({
        rateValue: 82000,
        rateBaseAmount: 5000,
      }),
    ).toBe('Taux actuel : 82\u202f000 GNF / 5\u202f000 FCFA')
  })

  it('uses the Phase 27C GNF-only correspondent transaction message', () => {
    expect(CORRESPONDENT_GNF_ONLY_MESSAGE).toBe(
      'La création de transaction correspondant est disponible uniquement pour les correspondants en GNF pour le moment.',
    )
  })

  it('builds correspondent identity without exposing raw membership ids', () => {
    expect(
      getCorrespondentVisibleIdentity(
        createCorrespondent({ name: 'Kalil Diallo', email: 'kalil@example.com' }),
      ),
    ).toEqual({ primary: 'Kalil Diallo', secondary: 'kalil@example.com' })
    expect(
      getCorrespondentVisibleIdentity(
        createCorrespondent({ name: null, email: 'kalil@example.com' }),
      ),
    ).toEqual({ primary: 'kalil@example.com', secondary: null })
    expect(
      getCorrespondentVisibleIdentity(
        createCorrespondent({ name: null, email: null, membershipId: 'raw-id' }),
      ),
    ).toEqual({ primary: 'Correspondant sans nom', secondary: null })
  })

  it('summarizes transactions, withdrawals and correspondent balances', () => {
    const overview = buildCorrespondentOverview({
      correspondents: [
        createCorrespondent({
          balance: 328000000,
          reservedBalance: 326000000,
          currency: 'GNF',
        }),
        createCorrespondent({
          membershipId: 'correspondent-2',
          balance: 100000,
          reservedBalance: 25000,
          currency: 'FCFA',
        }),
      ],
      transactions: [
        createTransaction({ status: 'pending' }),
        createTransaction({ id: 'tx-2', collectionCode: 'CCL-2', status: 'paid' }),
      ],
      withdrawals: [
        createWithdrawal({ status: 'pending' }),
        createWithdrawal({
          id: 'wd-2',
          deliveryCode: 'CDL-2',
          status: 'confirmed',
        }),
      ],
    })

    expect(overview.pendingTransactionCount).toBe(1)
    expect(overview.paidTransactionCount).toBe(1)
    expect(overview.pendingWithdrawalCount).toBe(1)
    expect(overview.confirmedWithdrawalCount).toBe(1)
    expect(overview.heldBalances).toEqual([
      { currency: 'GNF', balance: 328000000, reservedBalance: 326000000 },
      { currency: 'FCFA', balance: 100000, reservedBalance: 25000 },
    ])
  })

  it('auto-selects a sole correspondent and warns on insufficient balance', () => {
    expect(
      getAutoSelectedCorrespondentId({
        correspondents: [createCorrespondent()],
        selectedCorrespondentId: '',
      }),
    ).toBe('correspondent-1')
    expect(
      getWithdrawalWarning({
        amount: 326000001,
        correspondent: createCorrespondent({
          balance: 328000000,
          reservedBalance: 2000000,
          currency: 'GNF',
        }),
      }),
    ).toBe('Solde disponible insuffisant : 326\u202f000\u202f000 GNF disponible.')
    expect(
      getWithdrawalWarning({
        amount: 326000000,
        correspondent: createCorrespondent({
          balance: 328000000,
          reservedBalance: 2000000,
          currency: 'GNF',
        }),
      }),
    ).toBeNull()
  })

  it('maps API error codes to French messages', () => {
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'Invalid PIN',
          statusCode: 401,
          errorCode: 'INVALID_PIN',
        }),
      ),
    ).toBe('PIN de transaction invalide.')
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'Insufficient balance',
          statusCode: 400,
          errorCode: 'INSUFFICIENT_CORRESPONDENT_AVAILABLE_BALANCE',
        }),
      ),
    ).toBe('Solde disponible du correspondant insuffisant.')
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'No rate',
          statusCode: 400,
          errorCode: 'CORRESPONDENT_TRANSACTION_RATE_NOT_CONFIGURED',
        }),
      ),
    ).toBe(
      'Aucun taux configuré. Contactez le manager avant de créer une transaction.',
    )
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'GNF only',
          statusCode: 400,
          errorCode: 'CORRESPONDENT_TRANSACTION_GNF_ONLY',
        }),
      ),
    ).toBe(CORRESPONDENT_GNF_ONLY_MESSAGE)
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'Already paid',
          statusCode: 400,
          errorCode: 'CORRESPONDENT_COLLECTION_ALREADY_PAID',
        }),
      ),
    ).toBe('Transaction déjà payée.')
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'Canceled',
          statusCode: 400,
          errorCode: 'CORRESPONDENT_COLLECTION_CANCELED',
        }),
      ),
    ).toBe('Transaction annulée.')
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'Already confirmed',
          statusCode: 400,
          errorCode: 'CORRESPONDENT_DELIVERY_ALREADY_CONFIRMED',
        }),
      ),
    ).toBe('Retrait déjà confirmé.')
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'Delivery canceled',
          statusCode: 400,
          errorCode: 'CORRESPONDENT_DELIVERY_CANCELED',
        }),
      ),
    ).toBe('Retrait annulé.')
    expect(
      getCorrespondentErrorMessage(
        new AppApiError({
          message: 'Network Error',
          statusCode: 0,
        }),
      ),
    ).toBe(
      'Serveur indisponible. Vérifiez que l’API est démarrée et réessayez.',
    )
  })
})

function createCorrespondent(
  override: Partial<CorrespondentSummary> = {},
): CorrespondentSummary {
  return {
    membershipId: 'correspondent-1',
    name: 'Kalil Diallo',
    email: 'kalil@example.com',
    currency: 'GNF',
    balance: 328000000,
    reservedBalance: 0,
    availableBalance: 328000000,
    status: 'active',
    ...override,
  }
}

function createTransaction(
  override: Partial<CorrespondentTransaction> = {},
): CorrespondentTransaction {
  return {
    id: 'tx-1',
    collectionCode: 'CCL-260627-ABCD',
    amount: 328000000,
    currency: 'GNF',
    payoutAmount: 20000000,
    payoutCurrency: 'FCFA',
    beneficiaryName: 'Kadidia',
    beneficiaryPhone: '+22370000000',
    status: 'pending',
    correspondentMembership: 'correspondent-1',
    correspondentName: 'Kalil Diallo',
    correspondentEmail: 'kalil@example.com',
    createdAt: '2026-06-27T10:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
    ...override,
  }
}

function createWithdrawal(
  override: Partial<CorrespondentWithdrawal> = {},
): CorrespondentWithdrawal {
  return {
    id: 'wd-1',
    deliveryCode: 'CDL-260627-ABCD',
    amount: 326000000,
    currency: 'GNF',
    beneficiaryName: 'Kallo',
    beneficiaryPhone: '+22371000000',
    status: 'pending',
    correspondentMembership: 'correspondent-1',
    correspondentName: 'Kalil Diallo',
    correspondentEmail: 'kalil@example.com',
    createdAt: '2026-06-27T11:00:00.000Z',
    updatedAt: '2026-06-27T11:00:00.000Z',
    ...override,
  }
}
