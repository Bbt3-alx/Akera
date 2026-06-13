import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { AUTH_ME_QUERY_KEY } from '../auth/hooks.ts'
import { useAuthStore } from '../auth/store.ts'
import { useCompaniesStore } from '../companies/store.ts'
import { invalidateCompanyDashboard } from '../dashboard/hooks.ts'
import {
  acceptInvitation,
  createInvitation,
  listCompanyInvitations,
  listMyInvitations,
  rejectInvitation,
  revokeInvitation,
} from './api.ts'
import type {
  CreateInvitationPayload,
  InvitationStatus,
} from './types.ts'

type ActiveCompanyId = string | null | undefined

export const invitationKeys = {
  companyAll: (activeCompanyId: ActiveCompanyId) =>
    ['companyInvitations', activeCompanyId] as const,
  companyLists: (activeCompanyId: ActiveCompanyId) =>
    [...invitationKeys.companyAll(activeCompanyId), 'list'] as const,
  companyList: (
    activeCompanyId: ActiveCompanyId,
    status?: InvitationStatus,
  ) => [...invitationKeys.companyLists(activeCompanyId), status ?? 'all'] as const,
  myAll: ['myInvitations'] as const,
}

export function useCompanyInvitations(
  status?: InvitationStatus,
  enabled = true,
) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useQuery({
    queryKey: invitationKeys.companyList(activeCompanyId, status),
    queryFn: () => listCompanyInvitations(status),
    enabled: Boolean(activeCompanyId && enabled),
  })
}

export function useMyInvitations() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: invitationKeys.myAll,
    queryFn: listMyInvitations,
    enabled: Boolean(accessToken),
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: (payload: CreateInvitationPayload) => createInvitation(payload),
    onSuccess: async () => {
      await Promise.all([
        invalidateCompanyInvitationLists(queryClient, activeCompanyId),
        invalidateCompanyDashboard(queryClient, activeCompanyId),
      ])
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invitationKeys.myAll }),
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
        invalidateCompanyDashboard(queryClient, activeCompanyId),
      ])
    },
  })
}

export function useRejectInvitation() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: rejectInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invitationKeys.myAll }),
        invalidateCompanyDashboard(queryClient, activeCompanyId),
      ])
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)

  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: async () => {
      await Promise.all([
        invalidateCompanyInvitationLists(queryClient, activeCompanyId),
        invalidateCompanyDashboard(queryClient, activeCompanyId),
      ])
    },
  })
}

async function invalidateCompanyInvitationLists(
  queryClient: QueryClient,
  activeCompanyId: ActiveCompanyId,
) {
  if (!activeCompanyId) {
    return
  }

  await queryClient.invalidateQueries({
    queryKey: invitationKeys.companyLists(activeCompanyId),
  })
}
