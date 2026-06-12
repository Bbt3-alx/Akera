import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type {
  AcceptInvitationResponse,
  CompanyInvitation,
  CreateInvitationPayload,
  InvitationStatus,
} from './types.ts'

export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<CompanyInvitation> {
  const response = await http.post<
    ApiResponse<CompanyInvitation>,
    ApiResponse<CompanyInvitation>,
    CreateInvitationPayload
  >('/company-invitations', payload)

  return unwrapApiResponse(response)
}

export async function listCompanyInvitations(
  status?: InvitationStatus,
): Promise<CompanyInvitation[]> {
  const response = await http.get<
    ApiResponse<CompanyInvitation[]>,
    ApiResponse<CompanyInvitation[]>
  >('/company-invitations', {
    params: status ? { status } : undefined,
  })

  return unwrapApiResponse(response)
}

export async function listMyInvitations(): Promise<CompanyInvitation[]> {
  const response = await http.get<
    ApiResponse<CompanyInvitation[]>,
    ApiResponse<CompanyInvitation[]>
  >('/company-invitations/mine')

  return unwrapApiResponse(response)
}

export async function acceptInvitation(
  id: string,
): Promise<AcceptInvitationResponse> {
  const response = await http.post<
    ApiResponse<AcceptInvitationResponse>,
    ApiResponse<AcceptInvitationResponse>
  >(`/company-invitations/${encodeURIComponent(id)}/accept`)

  return unwrapApiResponse(response)
}

export async function rejectInvitation(id: string): Promise<CompanyInvitation> {
  const response = await http.post<
    ApiResponse<CompanyInvitation>,
    ApiResponse<CompanyInvitation>
  >(`/company-invitations/${encodeURIComponent(id)}/reject`)

  return unwrapApiResponse(response)
}

export async function revokeInvitation(id: string): Promise<CompanyInvitation> {
  const response = await http.post<
    ApiResponse<CompanyInvitation>,
    ApiResponse<CompanyInvitation>
  >(`/company-invitations/${encodeURIComponent(id)}/revoke`)

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
