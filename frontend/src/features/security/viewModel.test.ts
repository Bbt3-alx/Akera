import { describe, expect, it } from 'vitest'

import { AppApiError } from '../../shared/api/types.ts'
import {
  canUseTransactionPinSelfService,
  getTransactionPinRequiredContent,
  isTransactionPinNotConfiguredError,
  setupTransactionPinSchema,
} from './viewModel.ts'

describe('transaction PIN view model', () => {
  it('allows managers, employee agents, and partners to use transaction PIN self-service', () => {
    expect(canUseTransactionPinSelfService('manager')).toBe(true)
    expect(canUseTransactionPinSelfService('employee')).toBe(true)
    expect(canUseTransactionPinSelfService('partner')).toBe(true)
    expect(canUseTransactionPinSelfService(null)).toBe(false)
  })

  it('validates setup PIN as exactly 6 digits', () => {
    const result = setupTransactionPinSchema.safeParse({
      currentPassword: 'password',
      transactionPin: '12345',
      confirmTransactionPin: '12345',
    })

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((issue) =>
        issue.path.includes('transactionPin'),
      ),
    ).toBe(true)
  })

  it('validates setup PIN confirmation match', () => {
    const result = setupTransactionPinSchema.safeParse({
      currentPassword: 'password',
      transactionPin: '123456',
      confirmTransactionPin: '654321',
    })

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((issue) =>
        issue.path.includes('confirmTransactionPin'),
      ),
    ).toBe(true)
  })

  it('uses the required French setup CTA copy', () => {
    expect(getTransactionPinRequiredContent()).toEqual({
      title: 'PIN de transaction requis',
      description:
        'Configurez votre PIN à 6 chiffres pour enregistrer des dépôts ou payer des bénéficiaires.',
      actionLabel: 'Configurer mon PIN',
    })
  })

  it('recognizes both transaction PIN not-configured error codes', () => {
    expect(
      isTransactionPinNotConfiguredError(
        new AppApiError({
          message: 'Transaction PIN not configured',
          statusCode: 403,
          errorCode: 'TRANSACTION_PIN_NOT_CONFIGURED',
        }),
      ),
    ).toBe(true)
    expect(
      isTransactionPinNotConfiguredError(
        new AppApiError({
          message: 'PIN not configured',
          statusCode: 409,
          errorCode: 'PIN_NOT_CONFIGURED',
        }),
      ),
    ).toBe(true)
  })
})
