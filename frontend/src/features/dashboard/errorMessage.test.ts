import { describe, expect, it } from 'vitest'

import { AppApiError } from '../../shared/api/types.ts'
import {
  DASHBOARD_CONNECTIVITY_ERROR_MESSAGE,
  getDashboardErrorMessage,
} from './errorMessage.ts'

describe('dashboard error messages', () => {
  it('maps CORS and network failures to the French server connectivity message', () => {
    expect(
      getDashboardErrorMessage(
        new AppApiError({
          message: 'Network Error',
          statusCode: 0,
        }),
      ),
    ).toBe(DASHBOARD_CONNECTIVITY_ERROR_MESSAGE)

    expect(
      getDashboardErrorMessage(
        new Error(
          "Access to XMLHttpRequest has been blocked by CORS policy",
        ),
      ),
    ).toBe(DASHBOARD_CONNECTIVITY_ERROR_MESSAGE)
  })

  it('keeps API error messages when the server returns a response', () => {
    expect(
      getDashboardErrorMessage(
        new AppApiError({
          message: 'Authorization header missing or malformed',
          statusCode: 401,
        }),
      ),
    ).toBe('Authorization header missing or malformed')
  })
})
