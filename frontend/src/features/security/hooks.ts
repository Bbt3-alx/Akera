import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCompaniesStore } from '../companies/store.ts'
import {
  changeTransactionPin,
  getTransactionPinStatus,
  setupTransactionPin,
} from './api.ts'
import type {
  ChangeTransactionPinPayload,
  SetupTransactionPinPayload,
} from './types.ts'

type ActiveCompanyId = string | null | undefined

export const transactionPinKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['security', 'transactionPin', activeCompanyId] as const,
  status: (activeCompanyId: ActiveCompanyId) =>
    [...transactionPinKeys.all(activeCompanyId), 'status'] as const,
}

export function useTransactionPinStatus(enabled = true) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: transactionPinKeys.status(activeCompanyId),
    queryFn: getTransactionPinStatus,
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useSetupTransactionPin() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: SetupTransactionPinPayload) =>
      setupTransactionPin(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: transactionPinKeys.status(activeCompanyId),
      })
    },
  })
}

export function useChangeTransactionPin() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: ChangeTransactionPinPayload) =>
      changeTransactionPin(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: transactionPinKeys.status(activeCompanyId),
      })
    },
  })
}
