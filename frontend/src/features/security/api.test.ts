import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '../../shared/api/http.ts'
import {
  changeTransactionPin,
  getTransactionPinStatus,
  setupTransactionPin,
} from './api.ts'

describe('transaction PIN API helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the transaction PIN status endpoint', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: { configured: false },
    })

    await getTransactionPinStatus()

    expect(get).toHaveBeenCalledWith('/security/transaction-pin/status')
  })

  it('calls the setup endpoint with the current user PIN payload', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue({
      success: true,
      data: { configured: true },
    })

    await setupTransactionPin({
      currentPassword: 'password',
      transactionPin: '123456',
    })

    expect(post).toHaveBeenCalledWith('/security/transaction-pin/setup', {
      currentPassword: 'password',
      transactionPin: '123456',
    })
  })

  it('calls the change endpoint with the current user PIN payload', async () => {
    const patch = vi.spyOn(http, 'patch').mockResolvedValue({
      success: true,
      data: { configured: true },
    })

    await changeTransactionPin({
      currentPassword: 'password',
      currentTransactionPin: '123456',
      newTransactionPin: '654321',
    })

    expect(patch).toHaveBeenCalledWith('/security/transaction-pin/change', {
      currentPassword: 'password',
      currentTransactionPin: '123456',
      newTransactionPin: '654321',
    })
  })
})
