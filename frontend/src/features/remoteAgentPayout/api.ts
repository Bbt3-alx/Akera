import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiErrorResponse,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type {
  RemoteEligibleAgent,
  RemoteEligibleAgentListParams,
  RemoteAgentDeposit,
  RemoteAgentDepositPayload,
  RemoteAgentGroup,
  RemoteAgentGroupCreatePayload,
  RemoteAgentGroupMemberPayload,
  RemoteAgentGroupMemberUpdatePayload,
  RemoteAgentGroupsPagination,
  RemoteAgentGroupsResponse,
  RemoteAgentGroupUpdatePayload,
  RemoteAgentOperation,
  RemoteAgentOperationListParams,
  RemoteAgentOperationsPagination,
  RemoteAgentOperationsResponse,
  RemoteAgentListParams,
  RemoteAgentPayout,
  RemoteAgentPayoutCancelPayload,
  RemoteAgentPayoutCreatePayload,
  RemoteAgentPayoutCreateResponse,
  RemoteAgentPayoutLookupPayload,
  RemoteAgentPayoutPayPayload,
  RemoteAgentPayoutsPagination,
  RemoteAgentPayoutsResponse,
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

type CreatePayoutApiData =
  | RemoteAgentPayout
  | RemoteAgentPayoutCreateResponse

type CreatePayoutApiResponse =
  | ApiResponse<CreatePayoutApiData>
  | {
      success: true
      data: RemoteAgentPayoutCreateResponse
    }

export async function listRemoteAgentGroups(
  params?: RemoteAgentListParams,
): Promise<RemoteAgentGroupsResponse> {
  const response = await http.get<
    PaginatedApiResponse<RemoteAgentGroup>,
    PaginatedApiResponse<RemoteAgentGroup>
  >('/remote-agent-payouts/groups', {
    params: normalizeRemoteAgentListParams(params),
  })

  return normalizeRemoteAgentListResponse<
    RemoteAgentGroup,
    RemoteAgentGroupsPagination
  >(response)
}

export async function listMyRemoteAgentGroups(): Promise<RemoteAgentGroupsResponse> {
  const response = await http.get<
    PaginatedApiResponse<RemoteAgentGroup>,
    PaginatedApiResponse<RemoteAgentGroup>
  >('/remote-agent-payouts/my-groups')

  return normalizeRemoteAgentListResponse<
    RemoteAgentGroup,
    RemoteAgentGroupsPagination
  >(response)
}

export async function listEligibleRemoteAgents(
  params?: RemoteEligibleAgentListParams,
): Promise<RemoteEligibleAgent[]> {
  const response = await http.get<
    ApiResponse<RemoteEligibleAgent[]>,
    ApiResponse<RemoteEligibleAgent[]>
  >('/remote-agent-payouts/eligible-agents', {
    params: normalizeRemoteEligibleAgentListParams(params),
  })

  return unwrapApiResponse(response)
}

export async function getRemoteAgentGroup(
  groupId: string,
): Promise<RemoteAgentGroup> {
  const response = await http.get<
    ApiResponse<RemoteAgentGroup>,
    ApiResponse<RemoteAgentGroup>
  >(`/remote-agent-payouts/groups/${encodeURIComponent(groupId)}`)

  return unwrapApiResponse(response)
}

export async function createRemoteAgentGroup(
  payload: RemoteAgentGroupCreatePayload,
): Promise<RemoteAgentGroup> {
  const response = await http.post<
    ApiResponse<RemoteAgentGroup>,
    ApiResponse<RemoteAgentGroup>,
    RemoteAgentGroupCreatePayload
  >('/remote-agent-payouts/groups', payload)

  return unwrapApiResponse(response)
}

export async function updateRemoteAgentGroup(
  groupId: string,
  payload: RemoteAgentGroupUpdatePayload,
): Promise<RemoteAgentGroup> {
  const response = await http.patch<
    ApiResponse<RemoteAgentGroup>,
    ApiResponse<RemoteAgentGroup>,
    RemoteAgentGroupUpdatePayload
  >(`/remote-agent-payouts/groups/${encodeURIComponent(groupId)}`, payload)

  return unwrapApiResponse(response)
}

export async function addRemoteAgentGroupMember(
  groupId: string,
  payload: RemoteAgentGroupMemberPayload & { transactionPin: string },
): Promise<RemoteAgentGroup> {
  const response = await http.post<
    ApiResponse<RemoteAgentGroup>,
    ApiResponse<RemoteAgentGroup>,
    RemoteAgentGroupMemberPayload & { transactionPin: string }
  >(`/remote-agent-payouts/groups/${encodeURIComponent(groupId)}/members`, payload)

  return unwrapApiResponse(response)
}

export async function updateRemoteAgentGroupMember(
  groupId: string,
  membershipId: string,
  payload: RemoteAgentGroupMemberUpdatePayload,
): Promise<RemoteAgentGroup> {
  const response = await http.patch<
    ApiResponse<RemoteAgentGroup>,
    ApiResponse<RemoteAgentGroup>,
    RemoteAgentGroupMemberUpdatePayload
  >(
    `/remote-agent-payouts/groups/${encodeURIComponent(
      groupId,
    )}/members/${encodeURIComponent(membershipId)}`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function recordRemoteAgentGroupDeposit(
  groupId: string,
  payload: RemoteAgentDepositPayload,
): Promise<RemoteAgentDeposit> {
  const response = await http.post<
    ApiResponse<RemoteAgentDeposit>,
    ApiResponse<RemoteAgentDeposit>,
    RemoteAgentDepositPayload
  >(
    `/remote-agent-payouts/groups/${encodeURIComponent(groupId)}/deposits`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function listRemoteAgentPayouts(
  params?: RemoteAgentListParams,
): Promise<RemoteAgentPayoutsResponse> {
  const response = await http.get<
    PaginatedApiResponse<RemoteAgentPayout>,
    PaginatedApiResponse<RemoteAgentPayout>
  >('/remote-agent-payouts', {
    params: normalizeRemoteAgentListParams(params),
  })

  return normalizeRemoteAgentListResponse<
    RemoteAgentPayout,
    RemoteAgentPayoutsPagination
  >(response)
}

export async function listRemoteAgentOperations(
  params?: RemoteAgentOperationListParams,
): Promise<RemoteAgentOperationsResponse> {
  const response = await http.get<
    PaginatedApiResponse<RemoteAgentOperation>,
    PaginatedApiResponse<RemoteAgentOperation>
  >('/remote-agent-payouts/operations', {
    params: normalizeRemoteAgentOperationListParams(params),
  })

  return normalizeRemoteAgentListResponse<
    RemoteAgentOperation,
    RemoteAgentOperationsPagination
  >(response)
}

export async function createRemoteAgentPayout(
  payload: RemoteAgentPayoutCreatePayload,
): Promise<RemoteAgentPayoutCreateResponse> {
  const response = await http.post<
    CreatePayoutApiResponse,
    CreatePayoutApiResponse,
    RemoteAgentPayoutCreatePayload
  >('/remote-agent-payouts', payload)

  return normalizeRemoteAgentCreatePayoutResponse(response)
}

export async function lookupRemoteAgentPayout(
  payload: RemoteAgentPayoutLookupPayload,
): Promise<RemoteAgentPayout> {
  const response = await http.post<
    ApiResponse<RemoteAgentPayout>,
    ApiResponse<RemoteAgentPayout>,
    RemoteAgentPayoutLookupPayload
  >('/remote-agent-payouts/lookup', payload)

  return unwrapApiResponse(response)
}

export async function getRemoteAgentPayout(
  payoutCode: string,
): Promise<RemoteAgentPayout> {
  const response = await http.get<
    ApiResponse<RemoteAgentPayout>,
    ApiResponse<RemoteAgentPayout>
  >(`/remote-agent-payouts/${encodeURIComponent(payoutCode)}`)

  return unwrapApiResponse(response)
}

export async function payRemoteAgentPayout(
  payoutCode: string,
  payload: RemoteAgentPayoutPayPayload,
): Promise<RemoteAgentPayout> {
  const response = await http.post<
    ApiResponse<RemoteAgentPayout>,
    ApiResponse<RemoteAgentPayout>,
    RemoteAgentPayoutPayPayload
  >(`/remote-agent-payouts/${encodeURIComponent(payoutCode)}/pay`, payload)

  return unwrapApiResponse(response)
}

export async function cancelRemoteAgentPayout(
  payoutCode: string,
  payload: RemoteAgentPayoutCancelPayload,
): Promise<RemoteAgentPayout> {
  const response = await http.post<
    ApiResponse<RemoteAgentPayout>,
    ApiResponse<RemoteAgentPayout>,
    RemoteAgentPayoutCancelPayload
  >(`/remote-agent-payouts/${encodeURIComponent(payoutCode)}/cancel`, payload)

  return unwrapApiResponse(response)
}

export function normalizeRemoteAgentCreatePayoutResponse(
  response: CreatePayoutApiResponse,
): RemoteAgentPayoutCreateResponse {
  const data = unwrapApiResponse(response)

  if (isCreatePayoutEnvelope(data)) {
    return {
      payout: data.payout,
      beneficiaryCode: data.beneficiaryCode,
    }
  }

  return { payout: data }
}

export function normalizeRemoteAgentListResponse<
  T,
  TPagination extends { page: number; limit: number; total: number; pages?: number },
>(response: PaginatedApiResponse<T>): {
  data: T[]
  pagination?: TPagination
} {
  if (response.success) {
    return {
      data: response.data,
      pagination: normalizePagination<TPagination>(response.pagination),
    }
  }

  throw new AppApiError({
    message: response.message,
    statusCode: response.code ?? 0,
    errorCode: response.errorCode,
    details: response.details,
  })
}

export function normalizeRemoteAgentListParams(
  params?: RemoteAgentListParams | null,
): RemoteAgentListParams {
  if (!params) {
    return {}
  }

  const normalized: RemoteAgentListParams = {}

  if (params.page !== undefined && params.page !== null) {
    normalized.page = params.page
  }

  if (params.limit !== undefined && params.limit !== null) {
    normalized.limit = params.limit
  }

  const status = normalizeOptionalListString(params.status)

  if (status) {
    normalized.status = status as RemoteAgentListParams['status']
  }

  const search = normalizeOptionalListString(params.search)

  if (search) {
    normalized.search = search
  }

  return normalized
}

export function normalizeRemoteAgentOperationListParams(
  params?: RemoteAgentOperationListParams | null,
): RemoteAgentOperationListParams {
  if (!params) {
    return {}
  }

  const normalized: RemoteAgentOperationListParams = {}

  if (params.page !== undefined && params.page !== null) {
    normalized.page = params.page
  }

  if (params.limit !== undefined && params.limit !== null) {
    normalized.limit = params.limit
  }

  const search = normalizeOptionalListString(params.search)
  const status = normalizeOptionalListString(params.status)
  const type = normalizeOptionalListString(params.type)

  if (search) {
    normalized.search = search
  }

  if (status) {
    normalized.status = status
  }

  if (type) {
    normalized.type = type as RemoteAgentOperationListParams['type']
  }

  return normalized
}

export function normalizeRemoteEligibleAgentListParams(
  params?: RemoteEligibleAgentListParams | null,
): RemoteEligibleAgentListParams {
  if (!params) {
    return {}
  }

  const normalized: RemoteEligibleAgentListParams = {}
  const search = normalizeOptionalListString(params.search)
  const groupId = normalizeOptionalListString(params.groupId)

  if (search) {
    normalized.search = search
  }

  if (groupId) {
    normalized.groupId = groupId
  }

  if (params.limit !== undefined && params.limit !== null) {
    normalized.limit = params.limit
  }

  return normalized
}

function normalizeOptionalListString(value: unknown): string | undefined {
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

function normalizePagination<
  TPagination extends { page: number; limit: number; total: number; pages?: number },
>(pagination?: ApiPagination): TPagination | undefined {
  if (!pagination) {
    return undefined
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    pages: pagination.pages ?? pagination.totalPages,
  } as TPagination
}

function isCreatePayoutEnvelope(
  data: CreatePayoutApiData,
): data is RemoteAgentPayoutCreateResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'payout' in data &&
    typeof data.payout === 'object' &&
    data.payout !== null
  )
}
