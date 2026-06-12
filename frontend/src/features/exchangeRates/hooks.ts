import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCompaniesStore } from '../companies/store.ts'
import { getCurrentExchangeRate, updateExchangeRate } from './api.ts'
import type { UpdateExchangeRatePayload } from './types.ts'

type ActiveCompanyId = string | null | undefined

export const exchangeRateKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['exchangeRate', activeCompanyId] as const,
  current: (activeCompanyId: ActiveCompanyId) =>
    [...exchangeRateKeys.all(activeCompanyId), 'current'] as const,
}

export function useCurrentExchangeRate(enabled = true) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: exchangeRateKeys.current(activeCompanyId),
    queryFn: getCurrentExchangeRate,
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useUpdateExchangeRate() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: UpdateExchangeRatePayload) =>
      updateExchangeRate(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: exchangeRateKeys.current(activeCompanyId),
      })
    },
  })
}
