import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { transactionKeys } from '../transactions/hooks.ts'
import { useCompaniesStore } from '../companies/store.ts'
import {
  createCompanyCashDeposit,
  getCompanyCash,
} from './api.ts'
import type { CreateCompanyCashDepositPayload } from './types.ts'

type ActiveCompanyId = string | null | undefined

export const companyCashKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['companyCash', activeCompanyId] as const,
  current: (activeCompanyId: ActiveCompanyId) =>
    [...companyCashKeys.all(activeCompanyId), 'current'] as const,
}

export function useCompanyCash(enabled = true) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: companyCashKeys.current(activeCompanyId),
    queryFn: getCompanyCash,
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useCreateCompanyCashDeposit() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: CreateCompanyCashDepositPayload) =>
      createCompanyCashDeposit(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: companyCashKeys.current(activeCompanyId),
        }),
        queryClient.invalidateQueries({
          queryKey: transactionKeys.trialBalance(activeCompanyId),
        }),
      ])
    },
  })
}
