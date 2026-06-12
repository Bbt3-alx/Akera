import { useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { AUTH_ME_QUERY_KEY, useMe } from '../../auth/hooks.ts'
import { useAuthStore } from '../../auth/store.ts'
import {
  useAcceptInvitation,
  useMyInvitations,
  useRejectInvitation,
} from '../../invitations/hooks.ts'
import type {
  CompanyInvitation,
  InvitationCompany,
} from '../../invitations/types.ts'
import { AppApiError } from '../../../shared/api/types.ts'
import { useCompaniesStore } from '../store.ts'

export function CompanySelectPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearAccessToken = useAuthStore((state) => state.clearAccessToken)
  const clearActiveCompanyId = useCompaniesStore(
    (state) => state.clearActiveCompanyId,
  )
  const setActiveCompanyId = useCompaniesStore(
    (state) => state.setActiveCompanyId,
  )
  const meQuery = useMe()
  const myInvitationsQuery = useMyInvitations()
  const acceptInvitationMutation = useAcceptInvitation()
  const rejectInvitationMutation = useRejectInvitation()
  const memberships = meQuery.data?.memberships
  const pendingInvitations = (myInvitationsQuery.data ?? []).filter(
    (invitation) => invitation.status === 'pending',
  )
  const hasPendingInvitations = pendingInvitations.length > 0
  const onlyCompanyId =
    memberships?.length === 1 ? memberships[0]?.companyId : null
  const isUnauthorized = isUnauthorizedError(meQuery.error)
  const invitationActionError = getErrorMessage(
    acceptInvitationMutation.error ?? rejectInvitationMutation.error,
  )
  const invitationListError = getErrorMessage(myInvitationsQuery.error)

  useEffect(() => {
    if (isUnauthorized) {
      clearAccessToken()
      clearActiveCompanyId()
    }
  }, [clearAccessToken, clearActiveCompanyId, isUnauthorized])

  useEffect(() => {
    if (
      onlyCompanyId &&
      !myInvitationsQuery.isLoading &&
      !hasPendingInvitations
    ) {
      setActiveCompanyId(onlyCompanyId)
      navigate('/app', { replace: true })
    }
  }, [
    hasPendingInvitations,
    myInvitationsQuery.isLoading,
    navigate,
    onlyCompanyId,
    setActiveCompanyId,
  ])

  function handleLogout() {
    clearAccessToken()
    clearActiveCompanyId()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  async function handleAcceptInvitation(invitation: CompanyInvitation) {
    try {
      const response = await acceptInvitationMutation.mutateAsync(invitation.id)
      const companyId = getCompanyId(
        response.membership?.company ?? response.invitation.company,
      )

      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })

      if (companyId) {
        setActiveCompanyId(companyId)
        navigate('/app', { replace: true })
      }
    } catch {
      return
    }
  }

  async function handleRejectInvitation(invitation: CompanyInvitation) {
    try {
      await rejectInvitationMutation.mutateAsync(invitation.id)
    } catch {
      return
    }
  }

  if (!accessToken || isUnauthorized) {
    return <Navigate to="/login" replace />
  }

  if (meQuery.isLoading) {
    return <CompanySelectShell>Loading...</CompanySelectShell>
  }

  if (meQuery.isError) {
    return (
      <CompanySelectShell>
        Unable to load your company access. Please try again.
      </CompanySelectShell>
    )
  }

  if (!memberships || memberships.length === 0) {
    return (
      <CompanySelectShell>
        <div className="w-full">
          <h1 className="text-2xl font-semibold">
            {hasPendingInvitations
              ? 'Pending invitations'
              : 'No company access yet'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {hasPendingInvitations
              ? 'Accept an invitation below or create your own company workspace.'
              : 'Create your company to start using Akera, or wait for an invitation from an existing company.'}
          </p>

          <InvitationList
            acceptingInvitationId={
              acceptInvitationMutation.isPending
                ? acceptInvitationMutation.variables
                : null
            }
            actionError={invitationActionError}
            invitations={pendingInvitations}
            isLoading={myInvitationsQuery.isLoading}
            listError={invitationListError}
            onAccept={(invitation) => void handleAcceptInvitation(invitation)}
            onReject={(invitation) => void handleRejectInvitation(invitation)}
            rejectingInvitationId={
              rejectInvitationMutation.isPending
                ? rejectInvitationMutation.variables
                : null
            }
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => navigate('/create-company')}
              type="button"
            >
              Create company
            </button>
            <button
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={handleLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        </div>
      </CompanySelectShell>
    )
  }

  if (memberships.length === 1 && !hasPendingInvitations) {
    return <CompanySelectShell>Redirecting...</CompanySelectShell>
  }

  return (
    <CompanySelectShell>
      <div className="w-full">
        <h1 className="text-2xl font-semibold">Select company</h1>

        <InvitationList
          acceptingInvitationId={
            acceptInvitationMutation.isPending
              ? acceptInvitationMutation.variables
              : null
          }
          actionError={invitationActionError}
          invitations={pendingInvitations}
          isLoading={myInvitationsQuery.isLoading}
          listError={invitationListError}
          onAccept={(invitation) => void handleAcceptInvitation(invitation)}
          onReject={(invitation) => void handleRejectInvitation(invitation)}
          rejectingInvitationId={
            rejectInvitationMutation.isPending
              ? rejectInvitationMutation.variables
              : null
          }
        />

        <div className="mt-6 space-y-3">
          {memberships.map((membership) => (
            <button
              className="w-full rounded border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50"
              key={membership.membershipId}
              onClick={() => {
                setActiveCompanyId(membership.companyId)
                navigate('/app')
              }}
              type="button"
            >
              <div className="font-medium text-slate-950">
                {membership.companyName}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                <span>{membership.role}</span>
                <span aria-hidden="true">-</span>
                <span>{membership.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </CompanySelectShell>
  )
}

type InvitationListProps = {
  acceptingInvitationId?: string | null
  actionError: string | null
  invitations: CompanyInvitation[]
  isLoading: boolean
  listError: string | null
  onAccept: (invitation: CompanyInvitation) => void
  onReject: (invitation: CompanyInvitation) => void
  rejectingInvitationId?: string | null
}

function InvitationList({
  acceptingInvitationId,
  actionError,
  invitations,
  isLoading,
  listError,
  onAccept,
  onReject,
  rejectingInvitationId,
}: InvitationListProps) {
  if (isLoading) {
    return (
      <p className="mt-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Loading invitations...
      </p>
    )
  }

  return (
    <div className="mt-5 space-y-3">
      {listError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {listError}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {invitations.map((invitation) => {
        const isAccepting = acceptingInvitationId === invitation.id
        const isRejecting = rejectingInvitationId === invitation.id
        const isMutating = Boolean(acceptingInvitationId || rejectingInvitationId)

        return (
          <article
            className="rounded border border-slate-200 bg-white p-4 shadow-sm"
            key={invitation.id}
          >
            <div>
              <h2 className="font-medium text-slate-950">
                {getCompanyName(invitation.company)}
              </h2>
              <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <InvitationDetail label="Role" value={invitation.role} />
                {invitation.currency ? (
                  <InvitationDetail
                    label="Currency"
                    value={invitation.currency}
                  />
                ) : null}
                {invitation.role === 'partner' ? (
                  <InvitationDetail
                    label="Starting balance"
                    value={formatAmount(
                      invitation.startingBalance ?? 0,
                      invitation.currency,
                    )}
                  />
                ) : null}
                <InvitationDetail
                  label="Expires"
                  value={formatDate(invitation.expiresAt)}
                />
              </dl>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                className="rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isMutating}
                onClick={() => onAccept(invitation)}
                type="button"
              >
                {isAccepting ? 'Accepting...' : 'Accept'}
              </button>
              <button
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isMutating}
                onClick={() => onReject(invitation)}
                type="button"
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

type InvitationDetailProps = {
  label: string
  value: string
}

function InvitationDetail({ label, value }: InvitationDetailProps) {
  return (
    <div>
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value}</dd>
    </div>
  )
}

type CompanySelectShellProps = {
  children: ReactNode
}

function CompanySelectShell({ children }: CompanySelectShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
      <section className="w-full max-w-2xl rounded border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </section>
    </main>
  )
}

function getCompanyId(company?: InvitationCompany | null): string | null {
  if (!company) {
    return null
  }

  return typeof company === 'string' ? company : company.id
}

function getCompanyName(company: InvitationCompany): string {
  return typeof company === 'string' ? 'Company invitation' : company.name
}

function formatAmount(amount: number, currency?: string) {
  const formattedAmount = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(amount)

  return currency ? `${formattedAmount} ${currency}` : formattedAmount
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof AppApiError || error instanceof Error) {
    return error.message
  }

  return 'Please try again.'
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AppApiError && error.statusCode === 401
}
