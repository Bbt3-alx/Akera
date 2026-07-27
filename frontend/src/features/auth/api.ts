import {
  AppApiError,
  type ApiErrorResponse,
  type ApiResponse,
} from '../../shared/api/types.ts'
import { http } from '../../shared/api/http.ts'
import type {
  AuthPayload,
  ForgotPasswordPayload,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  ResendVerificationPayload,
  ResendVerificationResponse,
  ResetPasswordPayload,
  SignupResponse,
  VerifyEmailPayload,
} from './types.ts'

type ResendVerificationApiResponse =
  | {
      success: true
      code?: number
      message: string
    }
  | ApiErrorResponse

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

export async function resendVerification(
  payload: ResendVerificationPayload,
): Promise<ResendVerificationResponse> {
  const response = await http.post<
    ResendVerificationApiResponse,
    ResendVerificationApiResponse,
    ResendVerificationPayload
  >('/auth/resend-verification', payload)

  if (response.success) {
    return { message: response.message ?? 'Demande enregistrée.' }
  }

  throw new AppApiError({
    message: response.message,
    statusCode: response.code ?? 0,
    errorCode: response.errorCode,
    details: response.details,
  })
}

export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<MessageResponse> {
  const response = await http.post<
    ApiResponse<unknown>,
    ApiResponse<unknown>,
    ForgotPasswordPayload
  >('/auth/forgot-password', payload)

  if (response.success) {
    return { message: response.message ?? 'Demande enregistrée.' }
  }

  throw new AppApiError({
    message: response.message,
    statusCode: response.code ?? 0,
    errorCode: response.errorCode,
  })
}

export async function resetPassword({
  token,
  password,
}: ResetPasswordPayload): Promise<MessageResponse> {
  const response = await http.post<
    ApiResponse<unknown>,
    ApiResponse<unknown>,
    { password: string }
  >(`/auth/reset-password/${encodeURIComponent(token)}`, { password })

  if (response.success) {
    return { message: response.message ?? 'Mot de passe mis à jour.' }
  }

  throw new AppApiError({
    message: response.message,
    statusCode: response.code ?? 0,
    errorCode: response.errorCode,
  })
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
