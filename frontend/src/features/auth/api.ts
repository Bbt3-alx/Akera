import { AppApiError, type ApiResponse } from '../../shared/api/types.ts'
import { http } from '../../shared/api/http.ts'
import type { AuthPayload, LoginPayload, RegisterPayload } from './types.ts'

export async function login(payload: LoginPayload): Promise<AuthPayload> {
  const response = await http.post<
    ApiResponse<AuthPayload>,
    ApiResponse<AuthPayload>,
    LoginPayload
  >('/auth/login', payload)

  return unwrapAuthResponse(response)
}

export async function getMe(): Promise<AuthPayload> {
  const response = await http.get<ApiResponse<AuthPayload>, ApiResponse<AuthPayload>>(
    '/auth/me',
  )

  return unwrapAuthResponse(response)
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthPayload> {
  const response = await http.post<
    ApiResponse<AuthPayload>,
    ApiResponse<AuthPayload>,
    RegisterPayload
  >('/auth/signup', payload)

  return unwrapAuthResponse(response)
}

function unwrapAuthResponse(response: ApiResponse<AuthPayload>): AuthPayload {
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
