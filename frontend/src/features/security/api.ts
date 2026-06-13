import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type {
  ChangeTransactionPinPayload,
  SetupTransactionPinPayload,
  TransactionPinStatus,
} from './types.ts'

export async function getTransactionPinStatus(): Promise<TransactionPinStatus> {
  const response = await http.get<
    ApiResponse<TransactionPinStatus>,
    ApiResponse<TransactionPinStatus>
  >('/security/transaction-pin/status')

  return unwrapApiResponse(response)
}

export async function setupTransactionPin(
  payload: SetupTransactionPinPayload,
): Promise<TransactionPinStatus> {
  const response = await http.post<
    ApiResponse<TransactionPinStatus>,
    ApiResponse<TransactionPinStatus>,
    SetupTransactionPinPayload
  >('/security/transaction-pin/setup', payload)

  return unwrapApiResponse(response)
}

export async function changeTransactionPin(
  payload: ChangeTransactionPinPayload,
): Promise<TransactionPinStatus> {
  const response = await http.patch<
    ApiResponse<TransactionPinStatus>,
    ApiResponse<TransactionPinStatus>,
    ChangeTransactionPinPayload
  >('/security/transaction-pin/change', payload)

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
