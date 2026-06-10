import { http } from '../../shared/api/http.ts'
import { AppApiError, type ApiResponse } from '../../shared/api/types.ts'
import type {
  CreateCompanyPayload,
  CreateCompanyResponse,
} from './types.ts'

export async function createCompany(
  payload: CreateCompanyPayload,
): Promise<CreateCompanyResponse> {
  const response = await http.post<
    ApiResponse<CreateCompanyResponse>,
    ApiResponse<CreateCompanyResponse>,
    CreateCompanyPayload
  >('/companies', payload)

  return unwrapCreateCompanyResponse(response)
}

function unwrapCreateCompanyResponse(
  response: ApiResponse<CreateCompanyResponse>,
): CreateCompanyResponse {
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
