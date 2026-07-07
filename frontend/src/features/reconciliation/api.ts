import { http } from '../../shared/api/http.ts'
import { AppApiError, type ApiResponse } from '../../shared/api/types.ts'
import type {
  ReconciliationFilters,
  ReconciliationIssue,
  ReconciliationIssueList,
  ReconciliationScanPayload,
  ReconciliationScanResult,
  ResolveReconciliationIssuePayload,
} from './types.ts'
import { normalizeReconciliationFilters } from './viewModel.ts'

export async function scanReconciliation(
  payload: ReconciliationScanPayload = {},
): Promise<ReconciliationScanResult> {
  const response = await http.post<
    ApiResponse<ReconciliationScanResult>,
    ApiResponse<ReconciliationScanResult>,
    ReconciliationScanPayload
  >('/reconciliation/scan', payload)

  return unwrapApiResponse(response)
}

export async function listReconciliationIssues(
  filters: ReconciliationFilters = {},
): Promise<ReconciliationIssueList> {
  const response = await http.get<
    ApiResponse<ReconciliationIssueList>,
    ApiResponse<ReconciliationIssueList>
  >('/reconciliation/issues', {
    params: normalizeReconciliationFilters(filters),
  })

  return unwrapApiResponse(response)
}

export async function resolveReconciliationIssue({
  issueId,
  note,
}: ResolveReconciliationIssuePayload): Promise<ReconciliationIssue> {
  const response = await http.patch<
    ApiResponse<ReconciliationIssue>,
    ApiResponse<ReconciliationIssue>,
    { note: string }
  >(`/reconciliation/issues/${issueId}/resolve`, { note })

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
