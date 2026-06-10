import { AppApiError, type ApiResponse } from '../../shared/api/types.ts'
import { http } from '../../shared/api/http.ts'
import type {
  AuthPayload,
  LoginPayload,
  RegisterPayload,
  SignupResponse,
  VerifyEmailPayload,
} from './types.ts'

export async function login(payload: LoginPayload): Promise<AuthPayload> {
  const response = await http.post<
    ApiResponse<AuthPayload>,
    ApiResponse<AuthPayload>,
    LoginPayload
  >('/auth/login', payload)

  return unwrapAuthResponse(response)
}

export async function getMe(): Promise<SignupResponse> {
  const response = await http.get<
    ApiResponse<SignupResponse>,
    ApiResponse<SignupResponse>
  >('/auth/me')

  return unwrapSignupResponse(response)
}

export async function register(
  payload: RegisterPayload,
): Promise<SignupResponse> {
  const response = await http.post<
    ApiResponse<SignupResponse>,
    ApiResponse<SignupResponse>,
    RegisterPayload
  >('/auth/signup', payload)

  return unwrapSignupResponse(response)
}

export async function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<AuthPayload> {
  const response = await http.post<
    ApiResponse<AuthPayload>,
    ApiResponse<AuthPayload>,
    VerifyEmailPayload
  >('/auth/verify-email', payload)

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

function unwrapSignupResponse(
  response: ApiResponse<SignupResponse>,
): SignupResponse {
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
