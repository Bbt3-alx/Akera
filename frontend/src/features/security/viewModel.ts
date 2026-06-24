import { z } from 'zod'

import type { AuthRole } from '../auth/types.ts'
import { AppApiError } from '../../shared/api/types.ts'

const PIN_PATTERN = /^\d{6}$/

export const setupTransactionPinSchema = z
  .object({
    transactionPin: z
      .string()
      .regex(PIN_PATTERN, 'Le PIN doit contenir exactement 6 chiffres'),
    confirmTransactionPin: z.string(),
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  })
  .refine((values) => values.transactionPin === values.confirmTransactionPin, {
    message: 'La confirmation du PIN doit correspondre',
    path: ['confirmTransactionPin'],
  })

export const changeTransactionPinSchema = z
  .object({
    currentTransactionPin: z
      .string()
      .regex(PIN_PATTERN, 'Le PIN actuel doit contenir exactement 6 chiffres'),
    newTransactionPin: z
      .string()
      .regex(PIN_PATTERN, 'Le nouveau PIN doit contenir exactement 6 chiffres'),
    confirmNewTransactionPin: z.string(),
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  })
  .refine(
    (values) => values.newTransactionPin === values.confirmNewTransactionPin,
    {
      message: 'La confirmation du PIN doit correspondre',
      path: ['confirmNewTransactionPin'],
    },
  )

export function canUseTransactionPinSelfService(
  activeRole?: AuthRole | null,
): boolean {
  return Boolean(activeRole)
}

export function getTransactionPinRequiredContent() {
  return {
    title: 'PIN de transaction requis',
    description:
      'Configurez votre PIN à 6 chiffres pour enregistrer des dépôts ou payer des bénéficiaires.',
    actionLabel: 'Configurer mon PIN',
  }
}

export function isTransactionPinNotConfiguredError(error: unknown): boolean {
  return (
    error instanceof AppApiError &&
    (error.errorCode === 'TRANSACTION_PIN_NOT_CONFIGURED' ||
      error.errorCode === 'PIN_NOT_CONFIGURED')
  )
}
