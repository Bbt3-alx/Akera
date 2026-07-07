import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCompaniesStore } from '../companies/store.ts'
import {
  listReconciliationIssues,
  resolveReconciliationIssue,
  scanReconciliation,
} from './api.ts'
import type {
  ReconciliationFilters,
  ReconciliationScanPayload,
  ResolveReconciliationIssuePayload,
} from './types.ts'

type ActiveCompanyId = string | null | undefined

export const reconciliationKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['reconciliation', activeCompanyId] as const,
  issues: (
    activeCompanyId: ActiveCompanyId,
    filters: ReconciliationFilters,
  ) => [...reconciliationKeys.all(activeCompanyId), 'issues', filters] as const,
}

export function useReconciliationIssues(filters: ReconciliationFilters) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: reconciliationKeys.issues(activeCompanyId, filters),
    queryFn: () => listReconciliationIssues(filters),
    enabled: Boolean(activeCompanyId),
  })
}

export function useScanReconciliation() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: ReconciliationScanPayload) =>
      scanReconciliation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reconciliationKeys.all(activeCompanyId),
      })
    },
  })
}

export function useResolveReconciliationIssue() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: ResolveReconciliationIssuePayload) =>
      resolveReconciliationIssue(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reconciliationKeys.all(activeCompanyId),
      })
    },
  })
}
