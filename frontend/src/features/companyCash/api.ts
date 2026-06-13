import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type {
  CompanyCashBalance,
  CompanyCashDeposit,
  CompanyCashDepositResponse,
  CreateCompanyCashDepositPayload,
} from './types.ts'

type CompanyCashDepositApiData =
  | CompanyCashDeposit
  | CompanyCashDepositResponse

export async function getCompanyCash(): Promise<CompanyCashBalance> {
  const response = await http.get<
    ApiResponse<CompanyCashBalance>,
    ApiResponse<CompanyCashBalance>
  >('/company/cash')

  return unwrapApiResponse(response)
}

export async function createCompanyCashDeposit(
  payload: CreateCompanyCashDepositPayload,
): Promise<CompanyCashDepositResponse> {
  const response = await http.post<
    ApiResponse<CompanyCashDepositApiData>,
    ApiResponse<CompanyCashDepositApiData>,
    CreateCompanyCashDepositPayload
  >('/company/cash/deposits', payload)

  return normalizeCompanyCashDepositResponse(unwrapApiResponse(response))
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

function normalizeCompanyCashDepositResponse(
  data: CompanyCashDepositApiData,
): CompanyCashDepositResponse {
  const deposit = isCompanyCashDepositResponse(data) ? data.deposit : data
  const responseBalance = isCompanyCashDepositResponse(data)
    ? data.balance
    : undefined

  return {
    deposit,
    balance: isCompleteBalance(responseBalance)
      ? responseBalance
      : {
          previous: deposit.previousBalance,
          current: deposit.currentBalance,
          currency: deposit.currency,
        },
  }
}

function isCompanyCashDepositResponse(
  data: CompanyCashDepositApiData,
): data is CompanyCashDepositResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'deposit' in data &&
    typeof data.deposit === 'object' &&
    data.deposit !== null
  )
}

function isCompleteBalance(
  value: CompanyCashDepositResponse['balance'] | undefined,
): value is CompanyCashDepositResponse['balance'] {
  return (
    typeof value?.previous === 'number' &&
    typeof value.current === 'number' &&
    (value.currency === 'FCFA' || value.currency === 'GNF')
  )
}
