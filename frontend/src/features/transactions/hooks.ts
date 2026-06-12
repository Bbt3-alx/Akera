import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { useMe } from '../auth/hooks.ts'
import type { AuthRole } from '../auth/types.ts'
import { useCompaniesStore } from '../companies/store.ts'
import {
  cancelTransaction,
  createTransaction,
  downloadReceipt,
  getTransactionByCode,
  listTransactions,
  payTransaction,
  reverseTransaction,
  type ListTransactionsScope,
} from './api.ts'
import type {
  CancelTransactionPayload,
  CreateTransactionPayload,
  ListTransactionsParams,
  ReverseTransactionPayload,
} from './types.ts'

type ActiveCompanyId = string | null | undefined
type CompanyTransactionReadRole = Extract<AuthRole, 'manager' | 'employee'>

type CancelTransactionVariables = {
  transactionCode: string
  payload?: CancelTransactionPayload
}

type ReverseTransactionVariables = {
  transactionCode: string
  payload: ReverseTransactionPayload
}

export const transactionKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['transactions', activeCompanyId] as const,
  lists: (activeCompanyId: ActiveCompanyId) =>
    [...transactionKeys.all(activeCompanyId), 'list'] as const,
  list: (
    activeCompanyId: ActiveCompanyId,
    scope: ListTransactionsScope | undefined,
    params?: ListTransactionsParams,
  ) => [...transactionKeys.lists(activeCompanyId), scope, params ?? {}] as const,
  detail: (activeCompanyId: ActiveCompanyId, transactionCode: string) =>
    [...transactionKeys.all(activeCompanyId), 'detail', transactionCode] as const,
  trialBalance: (activeCompanyId: ActiveCompanyId) =>
    [...transactionKeys.all(activeCompanyId), 'trialBalance'] as const,
}

export function useTransactions(params?: ListTransactionsParams) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const { data: me, isLoading: isMeLoading } = useMe()
  const activeRole = me?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )?.role
  const listScope = getTransactionListScope(activeRole)

  return useQuery({
    queryKey: transactionKeys.list(activeCompanyId, listScope, params),
    queryFn: () => listTransactions(params, listScope ?? 'company'),
    enabled: Boolean(activeCompanyId && listScope && !isMeLoading),
  })
}

export function useTransactionByCode(transactionCode?: string) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const enabled = Boolean(activeCompanyId && transactionCode)

  return useQuery({
    queryKey: transactionKeys.detail(activeCompanyId, transactionCode ?? ''),
    queryFn: () => getTransactionByCode(transactionCode ?? ''),
    enabled,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) => createTransaction(payload),
    onSuccess: async () => {
      await invalidateTransactionLists(queryClient, activeCompanyId)
    },
  })
}

export function usePayTransaction() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: payTransaction,
    onSuccess: async (response, transactionCode) => {
      await invalidateTransactionListAndDetail(
        queryClient,
        activeCompanyId,
        response.transaction.transactionCode || transactionCode,
      )
    },
  })
}

export function useDownloadReceipt() {
  return useMutation({
    mutationFn: downloadReceipt,
  })
}

export function useCancelTransaction() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({ transactionCode, payload }: CancelTransactionVariables) =>
      cancelTransaction(transactionCode, payload),
    onSuccess: async (transaction, { transactionCode }) => {
      await invalidateTransactionListAndDetail(
        queryClient,
        activeCompanyId,
        transaction.transactionCode || transactionCode,
      )
    },
  })
}

export function useReverseTransaction() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({ transactionCode, payload }: ReverseTransactionVariables) =>
      reverseTransaction(transactionCode, payload),
    onSuccess: async (transaction, { transactionCode }) => {
      await invalidateTransactionListAndDetail(
        queryClient,
        activeCompanyId,
        transaction.transactionCode || transactionCode,
      )
    },
  })
}

async function invalidateTransactionLists(
  queryClient: QueryClient,
  activeCompanyId: ActiveCompanyId,
) {
  if (!activeCompanyId) {
    return
  }

  await queryClient.invalidateQueries({
    queryKey: transactionKeys.lists(activeCompanyId),
  })
}

async function invalidateTransactionListAndDetail(
  queryClient: QueryClient,
  activeCompanyId: ActiveCompanyId,
  transactionCode?: string,
) {
  if (!activeCompanyId) {
    return
  }

  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: transactionKeys.lists(activeCompanyId),
    }),
  ]

  if (transactionCode) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(activeCompanyId, transactionCode),
      }),
    )
  }

  await Promise.all(invalidations)
}

function getTransactionListScope(
  role: AuthRole | undefined,
): ListTransactionsScope | undefined {
  if (role === 'partner') {
    return 'mine'
  }

  if (isCompanyTransactionReadRole(role)) {
    return 'company'
  }

  return undefined
}

function isCompanyTransactionReadRole(
  role: AuthRole | undefined,
): role is CompanyTransactionReadRole {
  return role === 'manager' || role === 'employee'
}
