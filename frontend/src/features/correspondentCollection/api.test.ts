import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '../../shared/api/http.ts'
import { AppApiError } from '../../shared/api/types.ts'
import {
  cancelCorrespondentTransaction,
  cancelCorrespondentWithdrawal,
  confirmCorrespondentWithdrawal,
  createCorrespondentTransaction,
  createCorrespondentWithdrawal,
  getCorrespondentTransaction,
  listCorrespondentTransactions,
  listCorrespondentWithdrawals,
  listCorrespondents,
  normalizeCorrespondentListParams,
  normalizeCorrespondentListResponse,
  payCorrespondentTransactionByCode,
} from './api.ts'
import type {
  CorrespondentListParams,
  CorrespondentTransaction,
  CorrespondentWithdrawal,
} from './types.ts'

describe('correspondent collection API helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists sanitized correspondents from the selector endpoint', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: [
        {
          membershipId: 'correspondent-1',
          name: 'Kalil Diallo',
          email: 'kalil@example.com',
          currency: 'GNF',
          balance: 328000000,
          reservedBalance: 2000000,
          availableBalance: 326000000,
          status: 'active',
        },
      ],
    })

    const response = await listCorrespondents({ search: 'kalil' })

    expect(get).toHaveBeenCalledWith('/correspondent-collections/correspondents', {
      params: { search: 'kalil' },
    })
    expect(response[0].availableBalance).toBe(326000000)
  })

  it('uses collection endpoints for visible transaction actions', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: [createTransaction()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const post = vi.spyOn(http, 'post').mockResolvedValue({
      success: true,
      data: createTransaction({ status: 'paid' }),
    })

    await listCorrespondentTransactions({ page: 1, limit: 20, status: 'pending' })
    await createCorrespondentTransaction({
      amount: 328000000,
      currency: 'GNF',
      beneficiaryName: 'Kadidia',
      beneficiaryPhone: '+22370000000',
      transactionPin: '123456',
      idempotencyKey: 'transaction-create-1',
    })
    await payCorrespondentTransactionByCode('CCL-260627-ABCD', {
      transactionPin: '123456',
    })

    expect(get).toHaveBeenCalledWith('/correspondent-collections', {
      params: { page: 1, limit: 20, status: 'pending' },
    })
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/correspondent-collections',
      expect.not.objectContaining({
        payoutAmount: expect.any(Number),
        payoutCurrency: expect.any(String),
        rateValue: expect.any(Number),
      }),
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/correspondent-collections/CCL-260627-ABCD/pay',
      { transactionPin: '123456' },
    )
  })

  it('uses delivery endpoints for visible withdrawal actions', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: [createWithdrawal()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const post = vi.spyOn(http, 'post').mockResolvedValue({
      success: true,
      data: createWithdrawal({ status: 'confirmed' }),
    })

    await listCorrespondentWithdrawals({
      correspondentMembershipId: 'correspondent-1',
      status: 'pending',
    })
    await createCorrespondentWithdrawal({
      correspondentMembershipId: 'correspondent-1',
      amount: 326000000,
      currency: 'GNF',
      beneficiaryName: 'Kallo',
      transactionPin: '123456',
      idempotencyKey: 'withdrawal-create-1',
    })
    await confirmCorrespondentWithdrawal('CDL-260627-ABCD', {
      transactionPin: '123456',
    })
    await cancelCorrespondentWithdrawal('CDL-260627-ABCD', {
      transactionPin: '123456',
      reason: 'Erreur',
    })

    expect(get).toHaveBeenCalledWith('/correspondent-deliveries', {
      params: {
        correspondentMembershipId: 'correspondent-1',
        status: 'pending',
      },
    })
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/correspondent-deliveries',
      expect.objectContaining({ idempotencyKey: 'withdrawal-create-1' }),
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/correspondent-deliveries/CDL-260627-ABCD/confirm',
      { transactionPin: '123456' },
    )
    expect(post).toHaveBeenNthCalledWith(
      3,
      '/correspondent-deliveries/CDL-260627-ABCD/cancel',
      { transactionPin: '123456', reason: 'Erreur' },
    )
  })

  it('gets and cancels transactions by encoded code', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: createTransaction(),
    })
    const post = vi.spyOn(http, 'post').mockResolvedValue({
      success: true,
      data: createTransaction({ status: 'canceled' }),
    })

    await getCorrespondentTransaction('CCL/260627')
    await cancelCorrespondentTransaction('CCL/260627', {
      transactionPin: '123456',
      reason: 'Erreur',
    })

    expect(get).toHaveBeenCalledWith('/correspondent-collections/CCL%2F260627')
    expect(post).toHaveBeenCalledWith(
      '/correspondent-collections/CCL%2F260627/cancel',
      { transactionPin: '123456', reason: 'Erreur' },
    )
  })

  it('normalizes list params and paginated API envelopes', () => {
    expect(
      normalizeCorrespondentListParams({
        page: 1,
        limit: 50,
        status: '' as CorrespondentListParams['status'],
        search: ' ',
        correspondentMembershipId: 'correspondent-1',
      }),
    ).toEqual({
      page: 1,
      limit: 50,
      correspondentMembershipId: 'correspondent-1',
    })
    expect(
      normalizeCorrespondentListResponse<CorrespondentTransaction>({
        success: true,
        data: [createTransaction()],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    ).toEqual({
      data: [createTransaction()],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    })
  })

  it('throws AppApiError for API error envelopes', () => {
    expect(() =>
      normalizeCorrespondentListResponse<CorrespondentTransaction>({
        success: false,
        code: 403,
        message: 'Access denied',
        errorCode: 'CORRESPONDENT_COLLECTION_ACCESS_DENIED',
      }),
    ).toThrow(AppApiError)
  })
})

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
    status: 'pending',
    correspondentMembership: 'correspondent-1',
    correspondentName: 'Kalil Diallo',
    correspondentEmail: 'kalil@example.com',
    createdAt: '2026-06-27T11:00:00.000Z',
    updatedAt: '2026-06-27T11:00:00.000Z',
    ...override,
  }
}
