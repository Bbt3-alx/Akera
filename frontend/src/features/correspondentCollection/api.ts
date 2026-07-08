import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiErrorResponse,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type {
  CancelCorrespondentTransactionPayload,
  CancelCorrespondentWithdrawalPayload,
  ConfirmCorrespondentWithdrawalPayload,
  CorrespondentModificationDecisionPayload,
  CorrespondentModificationRequest,
  CorrespondentModificationRequestPayload,
  CorrespondentListParams,
  CorrespondentListResponse,
  CorrespondentPagination,
  CorrespondentSelectorParams,
  CorrespondentSummary,
  CorrespondentTransaction,
  CorrespondentWithdrawal,
  CreateCorrespondentTransactionPayload,
  CreateCorrespondentWithdrawalPayload,
  PayCorrespondentTransactionPayload,
} from './types.ts'

type ApiPagination = {
  page: number
  limit: number
  total: number
  pages?: number
  totalPages?: number
}

type PaginatedApiResponse<T> =
  | {
      success: true
      code?: number
      data: T[]
      pagination?: ApiPagination
    }
  | ApiErrorResponse

export async function listCorrespondents(
  params?: CorrespondentSelectorParams,
): Promise<CorrespondentSummary[]> {
  const response = await http.get<
    ApiResponse<CorrespondentSummary[]>,
    ApiResponse<CorrespondentSummary[]>
  >('/correspondent-collections/correspondents', {
    params: normalizeCorrespondentSelectorParams(params),
  })

  return unwrapApiResponse(response)
}

export async function listCorrespondentTransactions(
  params?: CorrespondentListParams,
): Promise<CorrespondentListResponse<CorrespondentTransaction>> {
  const response = await http.get<
    PaginatedApiResponse<CorrespondentTransaction>,
    PaginatedApiResponse<CorrespondentTransaction>
  >('/correspondent-collections', {
    params: normalizeCorrespondentListParams(params),
  })

  return normalizeCorrespondentListResponse(response)
}

export async function getCorrespondentTransaction(
  transactionCode: string,
): Promise<CorrespondentTransaction> {
  const response = await http.get<
    ApiResponse<CorrespondentTransaction>,
    ApiResponse<CorrespondentTransaction>
  >(`/correspondent-collections/${encodeURIComponent(transactionCode)}`)

  return unwrapApiResponse(response)
}

export async function createCorrespondentTransaction(
  payload: CreateCorrespondentTransactionPayload,
): Promise<CorrespondentTransaction> {
  const response = await http.post<
    ApiResponse<CorrespondentTransaction>,
    ApiResponse<CorrespondentTransaction>,
    CreateCorrespondentTransactionPayload
  >('/correspondent-collections', payload)

  return unwrapApiResponse(response)
}

export async function payCorrespondentTransactionByCode(
  transactionCode: string,
  payload: PayCorrespondentTransactionPayload,
): Promise<CorrespondentTransaction> {
  const response = await http.post<
    ApiResponse<CorrespondentTransaction>,
    ApiResponse<CorrespondentTransaction>,
    PayCorrespondentTransactionPayload
  >(
    `/correspondent-collections/${encodeURIComponent(transactionCode)}/pay`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function payCorrespondentTransactionById(
  transactionId: string,
  payload: PayCorrespondentTransactionPayload,
): Promise<CorrespondentTransaction> {
  const response = await http.post<
    ApiResponse<CorrespondentTransaction>,
    ApiResponse<CorrespondentTransaction>,
    PayCorrespondentTransactionPayload
  >(
    `/correspondent-collections/id/${encodeURIComponent(transactionId)}/pay`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function cancelCorrespondentTransaction(
  transactionCode: string,
  payload: CancelCorrespondentTransactionPayload,
): Promise<CorrespondentTransaction> {
  const response = await http.post<
    ApiResponse<CorrespondentTransaction>,
    ApiResponse<CorrespondentTransaction>,
    CancelCorrespondentTransactionPayload
  >(
    `/correspondent-collections/${encodeURIComponent(transactionCode)}/cancel`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function cancelCorrespondentTransactionById(
  transactionId: string,
  payload: CancelCorrespondentTransactionPayload,
): Promise<CorrespondentTransaction> {
  const response = await http.post<
    ApiResponse<CorrespondentTransaction>,
    ApiResponse<CorrespondentTransaction>,
    CancelCorrespondentTransactionPayload
  >(
    `/correspondent-collections/id/${encodeURIComponent(transactionId)}/cancel`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function requestCorrespondentTransactionModification(
  transactionId: string,
  payload: CorrespondentModificationRequestPayload,
): Promise<CorrespondentModificationRequest> {
  const response = await http.post<
    ApiResponse<CorrespondentModificationRequest>,
    ApiResponse<CorrespondentModificationRequest>,
    CorrespondentModificationRequestPayload
  >(
    `/correspondent-collections/id/${encodeURIComponent(
      transactionId,
    )}/modification-requests`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function listCorrespondentWithdrawals(
  params?: CorrespondentListParams,
): Promise<CorrespondentListResponse<CorrespondentWithdrawal>> {
  const response = await http.get<
    PaginatedApiResponse<CorrespondentWithdrawal>,
    PaginatedApiResponse<CorrespondentWithdrawal>
  >('/correspondent-deliveries', {
    params: normalizeCorrespondentListParams(params),
  })

  return normalizeCorrespondentListResponse(response)
}

export async function getCorrespondentWithdrawal(
  withdrawalCode: string,
): Promise<CorrespondentWithdrawal> {
  const response = await http.get<
    ApiResponse<CorrespondentWithdrawal>,
    ApiResponse<CorrespondentWithdrawal>
  >(`/correspondent-deliveries/${encodeURIComponent(withdrawalCode)}`)

  return unwrapApiResponse(response)
}

export async function createCorrespondentWithdrawal(
  payload: CreateCorrespondentWithdrawalPayload,
): Promise<CorrespondentWithdrawal> {
  const response = await http.post<
    ApiResponse<CorrespondentWithdrawal>,
    ApiResponse<CorrespondentWithdrawal>,
    CreateCorrespondentWithdrawalPayload
  >('/correspondent-deliveries', payload)

  return unwrapApiResponse(response)
}

export async function confirmCorrespondentWithdrawal(
  withdrawalCode: string,
  payload: ConfirmCorrespondentWithdrawalPayload,
): Promise<CorrespondentWithdrawal> {
  const response = await http.post<
    ApiResponse<CorrespondentWithdrawal>,
    ApiResponse<CorrespondentWithdrawal>,
    ConfirmCorrespondentWithdrawalPayload
  >(
    `/correspondent-deliveries/${encodeURIComponent(withdrawalCode)}/confirm`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function confirmCorrespondentWithdrawalById(
  withdrawalId: string,
  payload: ConfirmCorrespondentWithdrawalPayload,
): Promise<CorrespondentWithdrawal> {
  const response = await http.post<
    ApiResponse<CorrespondentWithdrawal>,
    ApiResponse<CorrespondentWithdrawal>,
    ConfirmCorrespondentWithdrawalPayload
  >(
    `/correspondent-deliveries/id/${encodeURIComponent(withdrawalId)}/confirm`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function cancelCorrespondentWithdrawal(
  withdrawalCode: string,
  payload: CancelCorrespondentWithdrawalPayload,
): Promise<CorrespondentWithdrawal> {
  const response = await http.post<
    ApiResponse<CorrespondentWithdrawal>,
    ApiResponse<CorrespondentWithdrawal>,
    CancelCorrespondentWithdrawalPayload
  >(
    `/correspondent-deliveries/${encodeURIComponent(withdrawalCode)}/cancel`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function cancelCorrespondentWithdrawalById(
  withdrawalId: string,
  payload: CancelCorrespondentWithdrawalPayload,
): Promise<CorrespondentWithdrawal> {
  const response = await http.post<
    ApiResponse<CorrespondentWithdrawal>,
    ApiResponse<CorrespondentWithdrawal>,
    CancelCorrespondentWithdrawalPayload
  >(
    `/correspondent-deliveries/id/${encodeURIComponent(withdrawalId)}/cancel`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function requestCorrespondentWithdrawalModification(
  withdrawalId: string,
  payload: CorrespondentModificationRequestPayload,
): Promise<CorrespondentModificationRequest> {
  const response = await http.post<
    ApiResponse<CorrespondentModificationRequest>,
    ApiResponse<CorrespondentModificationRequest>,
    CorrespondentModificationRequestPayload
  >(
    `/correspondent-deliveries/id/${encodeURIComponent(
      withdrawalId,
    )}/modification-requests`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function listCorrespondentModificationRequests(
  params?: CorrespondentListParams,
): Promise<CorrespondentListResponse<CorrespondentModificationRequest>> {
  const response = await http.get<
    PaginatedApiResponse<CorrespondentModificationRequest>,
    PaginatedApiResponse<CorrespondentModificationRequest>
  >('/correspondent-modification-requests', {
    params: normalizeCorrespondentListParams(params),
  })

  return normalizeCorrespondentListResponse(response)
}

export async function approveCorrespondentModificationRequest(
  requestId: string,
  payload: CorrespondentModificationDecisionPayload,
): Promise<CorrespondentModificationRequest> {
  const response = await http.post<
    ApiResponse<CorrespondentModificationRequest>,
    ApiResponse<CorrespondentModificationRequest>,
    CorrespondentModificationDecisionPayload
  >(
    `/correspondent-modification-requests/${encodeURIComponent(
      requestId,
    )}/approve`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function rejectCorrespondentModificationRequest(
  requestId: string,
  payload: CorrespondentModificationDecisionPayload,
): Promise<CorrespondentModificationRequest> {
  const response = await http.post<
    ApiResponse<CorrespondentModificationRequest>,
    ApiResponse<CorrespondentModificationRequest>,
    CorrespondentModificationDecisionPayload
  >(
    `/correspondent-modification-requests/${encodeURIComponent(
      requestId,
    )}/reject`,
    payload,
  )

  return unwrapApiResponse(response)
}

export function normalizeCorrespondentListResponse<T>(
  response: PaginatedApiResponse<T>,
): CorrespondentListResponse<T> {
  if (response.success) {
    return {
      data: response.data,
      pagination: normalizePagination(response.pagination),
    }
  }

  throw new AppApiError({
    message: response.message,
    statusCode: response.code ?? 0,
    errorCode: response.errorCode,
    details: response.details,
  })
}

export function normalizeCorrespondentListParams(
  params?: CorrespondentListParams | null,
): CorrespondentListParams {
  if (!params) {
    return {}
  }

  const normalized: CorrespondentListParams = {}
  const status = normalizeOptionalString(params.status)
  const search = normalizeOptionalString(params.search)
  const correspondentMembershipId = normalizeOptionalString(
    params.correspondentMembershipId,
  )

  if (params.page !== undefined && params.page !== null) {
    normalized.page = params.page
  }

  if (params.limit !== undefined && params.limit !== null) {
    normalized.limit = params.limit
  }

  if (status) {
    normalized.status = status as CorrespondentListParams['status']
  }

  if (search) {
    normalized.search = search
  }

  if (correspondentMembershipId) {
    normalized.correspondentMembershipId = correspondentMembershipId
  }

  return normalized
}

function normalizeCorrespondentSelectorParams(
  params?: CorrespondentSelectorParams | null,
): CorrespondentSelectorParams {
  const search = normalizeOptionalString(params?.search)

  return search ? { search } : {}
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed || undefined
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

function normalizePagination(
  pagination?: ApiPagination,
): CorrespondentPagination | undefined {
  if (!pagination) {
    return undefined
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    pages: pagination.pages ?? pagination.totalPages,
  }
}
