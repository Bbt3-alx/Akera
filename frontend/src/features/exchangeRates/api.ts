import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type {
  CompanyExchangeRate,
  UpdateExchangeRatePayload,
} from './types.ts'

export async function getCurrentExchangeRate(): Promise<CompanyExchangeRate | null> {
  const response = await http.get<
    ApiResponse<CompanyExchangeRate | null>,
    ApiResponse<CompanyExchangeRate | null>
  >('/company/exchange-rate')

  return unwrapApiResponse(response)
}

export async function updateExchangeRate(
  payload: UpdateExchangeRatePayload,
): Promise<CompanyExchangeRate> {
  const response = await http.put<
    ApiResponse<CompanyExchangeRate>,
    ApiResponse<CompanyExchangeRate>,
    UpdateExchangeRatePayload
  >('/company/exchange-rate', payload)

  return unwrapApiResponse(response)
}

function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (response.success) {
    return response.data
  }

  throw new AppApiError({
    message: response.message,
    statusCode: response.code ?? 0,
    errorCode: response.errorCode,
    details: response.details,
  })
}
