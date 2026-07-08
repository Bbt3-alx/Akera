import { http } from '../../shared/api/http.ts'
import { AppApiError, type ApiResponse } from '../../shared/api/types.ts'
import type { AuditTimelineFilters, AuditTimelineList } from './types.ts'
import { normalizeAuditTimelineFilters } from './viewModel.ts'

export async function listAuditTimelineEvents(
  filters: AuditTimelineFilters = {},
): Promise<AuditTimelineList> {
  const response = await http.get<
    ApiResponse<AuditTimelineList>,
    ApiResponse<AuditTimelineList>
  >('/audit-logs', {
    params: normalizeAuditTimelineFilters(filters),
  })

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
