import { useQuery } from '@tanstack/react-query'

import { useCompaniesStore } from '../companies/store.ts'
import { listAuditTimelineEvents } from './api.ts'
import type { AuditTimelineFilters } from './types.ts'

type ActiveCompanyId = string | null | undefined

export const auditTimelineKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['auditTimeline', activeCompanyId] as const,
  list: (activeCompanyId: ActiveCompanyId, filters: AuditTimelineFilters) =>
    [...auditTimelineKeys.all(activeCompanyId), 'list', filters] as const,
}

export function useAuditTimeline(filters: AuditTimelineFilters) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: auditTimelineKeys.list(activeCompanyId, filters),
    queryFn: () => listAuditTimelineEvents(filters),
    enabled: Boolean(activeCompanyId),
  })
}
