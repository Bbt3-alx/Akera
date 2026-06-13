import {
  useQuery,
  type QueryClient,
} from '@tanstack/react-query'

import { useCompaniesStore } from '../companies/store.ts'
import { getCompanyDashboard } from './api.ts'

type ActiveCompanyId = string | null | undefined

export const dashboardKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['company-dashboard', activeCompanyId] as const,
}

export function useCompanyDashboard() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: dashboardKeys.all(activeCompanyId),
    queryFn: getCompanyDashboard,
    enabled: Boolean(activeCompanyId),
  })
}

export async function invalidateCompanyDashboard(
  queryClient: QueryClient,
  activeCompanyId: ActiveCompanyId,
) {
  if (!activeCompanyId) {
    return
  }

  await queryClient.invalidateQueries({
    queryKey: dashboardKeys.all(activeCompanyId),
  })
}
