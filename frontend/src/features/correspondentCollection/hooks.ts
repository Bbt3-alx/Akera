import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { invalidateCompanyDashboard } from '../dashboard/hooks.ts'
import { useCompaniesStore } from '../companies/store.ts'
import {
  cancelCorrespondentTransaction,
  cancelCorrespondentWithdrawal,
  confirmCorrespondentWithdrawal,
  createCorrespondentTransaction,
  createCorrespondentWithdrawal,
  getCorrespondentTransaction,
  getCorrespondentWithdrawal,
  listCorrespondentTransactions,
  listCorrespondentWithdrawals,
  listCorrespondents,
  payCorrespondentTransactionByCode,
} from './api.ts'
import type {
  CancelCorrespondentTransactionPayload,
  CancelCorrespondentWithdrawalPayload,
  ConfirmCorrespondentWithdrawalPayload,
  CorrespondentListParams,
  CorrespondentSelectorParams,
  CreateCorrespondentTransactionPayload,
  CreateCorrespondentWithdrawalPayload,
  PayCorrespondentTransactionPayload,
} from './types.ts'

type ActiveCompanyId = string | null | undefined

type CodeMutationVariables<TPayload> = {
  code: string
  payload: TPayload
}

export const correspondentCollectionKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['correspondentCollection', activeCompanyId] as const,
  correspondents: (
    activeCompanyId: ActiveCompanyId,
    params?: CorrespondentSelectorParams,
  ) =>
    [
      ...correspondentCollectionKeys.all(activeCompanyId),
      'correspondents',
      params ?? {},
    ] as const,
  transactions: (activeCompanyId: ActiveCompanyId) =>
    [...correspondentCollectionKeys.all(activeCompanyId), 'transactions'] as const,
  transactionList: (
    activeCompanyId: ActiveCompanyId,
    params?: CorrespondentListParams,
  ) =>
    [
      ...correspondentCollectionKeys.transactions(activeCompanyId),
      params ?? {},
    ] as const,
  transactionDetail: (activeCompanyId: ActiveCompanyId, code: string) =>
    [
      ...correspondentCollectionKeys.transactions(activeCompanyId),
      'detail',
      code,
    ] as const,
  withdrawals: (activeCompanyId: ActiveCompanyId) =>
    [...correspondentCollectionKeys.all(activeCompanyId), 'withdrawals'] as const,
  withdrawalList: (
    activeCompanyId: ActiveCompanyId,
    params?: CorrespondentListParams,
  ) =>
    [
      ...correspondentCollectionKeys.withdrawals(activeCompanyId),
      params ?? {},
    ] as const,
  withdrawalDetail: (activeCompanyId: ActiveCompanyId, code: string) =>
    [
      ...correspondentCollectionKeys.withdrawals(activeCompanyId),
      'detail',
      code,
    ] as const,
}

export function useCorrespondents(
  params?: CorrespondentSelectorParams,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: correspondentCollectionKeys.correspondents(activeCompanyId, params),
    queryFn: () => listCorrespondents(params),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useCorrespondentTransactions(
  params?: CorrespondentListParams,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: correspondentCollectionKeys.transactionList(activeCompanyId, params),
    queryFn: () => listCorrespondentTransactions(params),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useCorrespondentTransaction(code?: string, enabled = true) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: correspondentCollectionKeys.transactionDetail(
      activeCompanyId,
      code ?? '',
    ),
    queryFn: () => getCorrespondentTransaction(code ?? ''),
    enabled: Boolean(activeCompanyId && code && enabled),
  })
}

export function useCorrespondentWithdrawals(
  params?: CorrespondentListParams,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: correspondentCollectionKeys.withdrawalList(activeCompanyId, params),
    queryFn: () => listCorrespondentWithdrawals(params),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useCorrespondentWithdrawal(code?: string, enabled = true) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: correspondentCollectionKeys.withdrawalDetail(
      activeCompanyId,
      code ?? '',
    ),
    queryFn: () => getCorrespondentWithdrawal(code ?? ''),
    enabled: Boolean(activeCompanyId && code && enabled),
  })
}

export function useCreateCorrespondentTransaction() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: CreateCorrespondentTransactionPayload) =>
      createCorrespondentTransaction(payload),
    onSuccess: async () => invalidateCorrespondentState(queryClient, activeCompanyId),
  })
}

export function usePayCorrespondentTransactionByCode() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({
      code,
      payload,
    }: CodeMutationVariables<PayCorrespondentTransactionPayload>) =>
      payCorrespondentTransactionByCode(code, payload),
    onSuccess: async () => invalidateCorrespondentState(queryClient, activeCompanyId),
  })
}

export function useCancelCorrespondentTransaction() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({
      code,
      payload,
    }: CodeMutationVariables<CancelCorrespondentTransactionPayload>) =>
      cancelCorrespondentTransaction(code, payload),
    onSuccess: async () => invalidateCorrespondentState(queryClient, activeCompanyId),
  })
}

export function useCreateCorrespondentWithdrawal() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: CreateCorrespondentWithdrawalPayload) =>
      createCorrespondentWithdrawal(payload),
    onSuccess: async () => invalidateCorrespondentState(queryClient, activeCompanyId),
  })
}

export function useConfirmCorrespondentWithdrawal() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({
      code,
      payload,
    }: CodeMutationVariables<ConfirmCorrespondentWithdrawalPayload>) =>
      confirmCorrespondentWithdrawal(code, payload),
    onSuccess: async () => invalidateCorrespondentState(queryClient, activeCompanyId),
  })
}

export function useCancelCorrespondentWithdrawal() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({
      code,
      payload,
    }: CodeMutationVariables<CancelCorrespondentWithdrawalPayload>) =>
      cancelCorrespondentWithdrawal(code, payload),
    onSuccess: async () => invalidateCorrespondentState(queryClient, activeCompanyId),
  })
}

async function invalidateCorrespondentState(
  queryClient: ReturnType<typeof useQueryClient>,
  activeCompanyId: ActiveCompanyId,
) {
  if (!activeCompanyId) {
    return
  }

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: correspondentCollectionKeys.all(activeCompanyId),
    }),
    invalidateCompanyDashboard(queryClient, activeCompanyId),
  ])
}
