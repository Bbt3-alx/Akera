import { describe, expect, it } from 'vitest'

import { AppApiError } from '../api/types.ts'
import { getFrenchErrorMessage } from './frenchError.ts'

describe('getFrenchErrorMessage', () => {
  it('maps known backend error codes to safe French copy', () => {
    expect(
      getFrenchErrorMessage(
        new AppApiError({
          message: 'Invalid credentials',
          statusCode: 401,
          errorCode: 'INVALID_CREDENTIALS',
        }),
      ),
    ).toBe('Adresse e-mail ou mot de passe incorrect.')
  })

  it('uses a French fallback for unknown failures', () => {
    expect(getFrenchErrorMessage(new Error('Network Error'))).toBe(
      'Une erreur est survenue. Veuillez réessayer.',
    )
  })
})
