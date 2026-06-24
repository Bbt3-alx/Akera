import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { invalidateCompanyDashboard } from '../dashboard/hooks.ts'
import { useCompaniesStore } from '../companies/store.ts'
import {
  addRemoteAgentGroupMember,
  cancelRemoteAgentPayout,
  createRemoteAgentGroup,
  createRemoteAgentPayout,
  getRemoteAgentGroup,
  listEligibleRemoteAgents,
  listMyRemoteAgentGroups,
  listRemoteAgentGroups,
  listRemoteAgentOperations,
  listRemoteAgentPayouts,
  lookupRemoteAgentPayout,
  payRemoteAgentPayout,
  recordRemoteAgentGroupDeposit,
  updateRemoteAgentGroup,
  updateRemoteAgentGroupMember,
} from './api.ts'
import type {
  RemoteAgentDepositPayload,
  RemoteAgentGroupCreatePayload,
  RemoteAgentGroupMemberPayload,
  RemoteAgentGroupMemberUpdatePayload,
  RemoteAgentGroupUpdatePayload,
  RemoteEligibleAgentListParams,
  RemoteAgentOperationListParams,
  RemoteAgentListParams,
  RemoteAgentPayoutCancelPayload,
  RemoteAgentPayoutCreatePayload,
  RemoteAgentPayoutLookupPayload,
  RemoteAgentPayoutPayPayload,
} from './types.ts'

type ActiveCompanyId = string | null | undefined

type GroupMutationVariables<TPayload> = {
  groupId: string
  payload: TPayload
}

type MemberMutationVariables = {
  groupId: string
  membershipId: string
  payload: RemoteAgentGroupMemberUpdatePayload
}

type PayoutMutationVariables<TPayload> = {
  payoutCode: string
  payload: TPayload
}

export const remoteAgentPayoutKeys = {
  all: (activeCompanyId: ActiveCompanyId) =>
    ['remoteAgentPayout', activeCompanyId] as const,
  groups: (activeCompanyId: ActiveCompanyId) =>
    [...remoteAgentPayoutKeys.all(activeCompanyId), 'groups'] as const,
  groupList: (
    activeCompanyId: ActiveCompanyId,
    params?: RemoteAgentListParams,
  ) => [...remoteAgentPayoutKeys.groups(activeCompanyId), params ?? {}] as const,
  myGroups: (activeCompanyId: ActiveCompanyId) =>
    [...remoteAgentPayoutKeys.groups(activeCompanyId), 'my-groups'] as const,
  groupDetail: (activeCompanyId: ActiveCompanyId, groupId: string) =>
    [...remoteAgentPayoutKeys.groups(activeCompanyId), 'detail', groupId] as const,
  eligibleAgents: (
    activeCompanyId: ActiveCompanyId,
    params?: RemoteEligibleAgentListParams,
  ) =>
    [
      ...remoteAgentPayoutKeys.groups(activeCompanyId),
      'eligible-agents',
      params ?? {},
    ] as const,
  payouts: (activeCompanyId: ActiveCompanyId) =>
    [...remoteAgentPayoutKeys.all(activeCompanyId), 'payouts'] as const,
  payoutList: (
    activeCompanyId: ActiveCompanyId,
    params?: RemoteAgentListParams,
  ) => [...remoteAgentPayoutKeys.payouts(activeCompanyId), params ?? {}] as const,
  operations: (activeCompanyId: ActiveCompanyId) =>
    [...remoteAgentPayoutKeys.all(activeCompanyId), 'operations'] as const,
  operationList: (
    activeCompanyId: ActiveCompanyId,
    params?: RemoteAgentOperationListParams,
  ) =>
    [...remoteAgentPayoutKeys.operations(activeCompanyId), params ?? {}] as const,
}

export function useRemoteAgentGroups(
  params?: RemoteAgentListParams,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: remoteAgentPayoutKeys.groupList(activeCompanyId, params),
    queryFn: () => listRemoteAgentGroups(params),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useMyRemoteAgentGroups(enabled = true) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: remoteAgentPayoutKeys.myGroups(activeCompanyId),
    queryFn: listMyRemoteAgentGroups,
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useRemoteAgentGroup(groupId?: string, enabled = true) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: remoteAgentPayoutKeys.groupDetail(activeCompanyId, groupId ?? ''),
    queryFn: () => getRemoteAgentGroup(groupId ?? ''),
    enabled: Boolean(activeCompanyId && groupId && enabled),
  })
}

export function useEligibleRemoteAgents(
  groupId?: string,
  search?: string,
  limit = 20,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const params: RemoteEligibleAgentListParams = {
    groupId,
    search,
    limit,
  }

  return useQuery({
    queryKey: remoteAgentPayoutKeys.eligibleAgents(activeCompanyId, params),
    queryFn: () => listEligibleRemoteAgents(params),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useRemoteAgentPayouts(
  params?: RemoteAgentListParams,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: remoteAgentPayoutKeys.payoutList(activeCompanyId, params),
    queryFn: () => listRemoteAgentPayouts(params),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useRemoteAgentOperations(
  params?: RemoteAgentOperationListParams,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: remoteAgentPayoutKeys.operationList(activeCompanyId, params),
    queryFn: () => listRemoteAgentOperations(params),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useCreateRemoteAgentGroup() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: RemoteAgentGroupCreatePayload) =>
      createRemoteAgentGroup(payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

export function useUpdateRemoteAgentGroup() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({ groupId, payload }: GroupMutationVariables<RemoteAgentGroupUpdatePayload>) =>
      updateRemoteAgentGroup(groupId, payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

export function useAddRemoteAgentGroupMember() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({
      groupId,
      payload,
    }: GroupMutationVariables<RemoteAgentGroupMemberPayload & { transactionPin: string }>) =>
      addRemoteAgentGroupMember(groupId, payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

export function useUpdateRemoteAgentGroupMember() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({ groupId, membershipId, payload }: MemberMutationVariables) =>
      updateRemoteAgentGroupMember(groupId, membershipId, payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

export function useRecordRemoteAgentGroupDeposit() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({ groupId, payload }: GroupMutationVariables<RemoteAgentDepositPayload>) =>
      recordRemoteAgentGroupDeposit(groupId, payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

export function useCreateRemoteAgentPayout() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: RemoteAgentPayoutCreatePayload) =>
      createRemoteAgentPayout(payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

export function useLookupRemoteAgentPayout() {
  return useMutation({
    mutationFn: (payload: RemoteAgentPayoutLookupPayload) =>
      lookupRemoteAgentPayout(payload),
  })
}

export function usePayRemoteAgentPayout() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({
      payoutCode,
      payload,
    }: PayoutMutationVariables<RemoteAgentPayoutPayPayload>) =>
      payRemoteAgentPayout(payoutCode, payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

export function useCancelRemoteAgentPayout() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: ({
      payoutCode,
      payload,
    }: PayoutMutationVariables<RemoteAgentPayoutCancelPayload>) =>
      cancelRemoteAgentPayout(payoutCode, payload),
    onSuccess: async () => invalidateRemoteAgentState(queryClient, activeCompanyId),
  })
}

async function invalidateRemoteAgentState(
  queryClient: ReturnType<typeof useQueryClient>,
  activeCompanyId: ActiveCompanyId,
) {
  if (!activeCompanyId) {
    return
  }

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: remoteAgentPayoutKeys.all(activeCompanyId),
    }),
    invalidateCompanyDashboard(queryClient, activeCompanyId),
  ])
}
