import { http } from '../../shared/api/http.ts'
import {
  AppApiError,
  type ApiResponse,
} from '../../shared/api/types.ts'
import type { CompanyDashboard } from './types.ts'

export async function getCompanyDashboard(): Promise<CompanyDashboard> {
  const response = await http.get<
    ApiResponse<CompanyDashboard>,
    ApiResponse<CompanyDashboard>
  >('/company/dashboard')

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
