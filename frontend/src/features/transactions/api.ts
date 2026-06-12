import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiErrorResponse,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type {
  CancelTransactionResponse,
  CancelTransactionPayload,
  CreateTransactionPayload,
  CreateTransactionResponse,
  ListTransactionsParams,
  ListTransactionsResponse,
  PayTransactionResponse,
  ReverseTransactionPayload,
  ReverseTransactionResponse,
  Transaction,
  TransactionsPagination,
} from './types.ts'

type ListTransactionsApiPagination = TransactionsPagination & {
  totalPages?: number
}

type ListTransactionsApiResponse =
  | {
      success: true
      code?: number
      pagination?: ListTransactionsApiPagination
      data: Transaction[]
    }
  | ApiErrorResponse

type PayTransactionApiData = PayTransactionResponse | Transaction

type CancelTransactionApiData = CancelTransactionResponse | Transaction

type CreateTransactionApiData = CreateTransactionResponse | Transaction

type ReverseTransactionApiData = ReverseTransactionResponse | Transaction

export async function listTransactions(
  params?: ListTransactionsParams,
): Promise<ListTransactionsResponse> {
  const response = await http.get<
    ListTransactionsApiResponse,
    ListTransactionsApiResponse
  >('/transactions', { params })

  return unwrapListTransactionsResponse(response)
}

export async function getTransactionByCode(
  transactionCode: string,
): Promise<Transaction> {
  const response = await http.get<ApiResponse<Transaction>, ApiResponse<Transaction>>(
    `/transactions/code/${encodeURIComponent(transactionCode)}`,
  )

  return unwrapApiResponse(response)
}

export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<Transaction> {
  const response = await http.post<
    ApiResponse<CreateTransactionApiData>,
    ApiResponse<CreateTransactionApiData>,
    CreateTransactionPayload
  >('/transactions', payload)

  return normalizeCreateTransactionResponse(unwrapApiResponse(response))
}

export async function payTransaction(
  transactionCode: string,
): Promise<PayTransactionResponse> {
  const response = await http.post<
    ApiResponse<PayTransactionApiData>,
    ApiResponse<PayTransactionApiData>
  >(`/transactions/pay/${encodeURIComponent(transactionCode)}`)

  return normalizePayTransactionResponse(unwrapApiResponse(response))
}

export async function downloadReceipt(receiptId: string): Promise<Blob> {
  return http.get<Blob, Blob>(
    `/transactions/receipt/${encodeURIComponent(receiptId)}`,
    {
      responseType: 'blob',
    },
  )
}

export async function cancelTransaction(
  transactionCode: string,
  payload?: CancelTransactionPayload,
): Promise<Transaction> {
  const response = await http.put<
    ApiResponse<CancelTransactionApiData>,
    ApiResponse<CancelTransactionApiData>,
    CancelTransactionPayload | undefined
  >(`/transactions/${encodeURIComponent(transactionCode)}/cancel`, payload)

  return normalizeCancelTransactionResponse(unwrapApiResponse(response))
}

export async function reverseTransaction(
  transactionCode: string,
  payload: ReverseTransactionPayload,
): Promise<Transaction> {
  const response = await http.post<
    ApiResponse<ReverseTransactionApiData>,
    ApiResponse<ReverseTransactionApiData>,
    ReverseTransactionPayload
  >(`/transactions/${encodeURIComponent(transactionCode)}/reverse`, payload)

  return normalizeReverseTransactionResponse(unwrapApiResponse(response))
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

function unwrapListTransactionsResponse(
  response: ListTransactionsApiResponse,
): ListTransactionsResponse {
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

function normalizePagination(
  pagination?: ListTransactionsApiPagination,
): TransactionsPagination | undefined {
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

function normalizePayTransactionResponse(
  data: PayTransactionApiData,
): PayTransactionResponse {
  if ('transaction' in data) {
    return {
      transaction: data.transaction,
      receipt: data.receipt ?? null,
    }
  }

  return { transaction: data, receipt: null }
}

function normalizeCreateTransactionResponse(
  data: CreateTransactionApiData,
): Transaction {
  if ('transaction' in data) {
    return data.transaction
  }

  return data
}

function normalizeCancelTransactionResponse(
  data: CancelTransactionApiData,
): Transaction {
  if ('transaction' in data) {
    return data.transaction
  }

  return data
}

function normalizeReverseTransactionResponse(
  data: ReverseTransactionApiData,
): Transaction {
  if ('transaction' in data) {
    return data.transaction
  }

  return data
}
