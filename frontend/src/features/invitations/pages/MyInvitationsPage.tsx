import { useState, type ReactNode } from 'react'

import {
  useAcceptInvitation,
  useMyInvitations,
  useRejectInvitation,
} from '../hooks.ts'
import type {
  CompanyInvitation,
  InvitationCompany,
} from '../types.ts'

export function MyInvitationsPage() {
  const myInvitationsQuery = useMyInvitations()
  const acceptInvitationMutation = useAcceptInvitation()
  const rejectInvitationMutation = useRejectInvitation()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const pendingInvitations = (myInvitationsQuery.data ?? []).filter(
    (invitation) => invitation.status === 'pending',
  )
  const actionError = getErrorMessage(
    acceptInvitationMutation.error ?? rejectInvitationMutation.error,
  )

  async function handleAcceptInvitation(invitation: CompanyInvitation) {
    setSuccessMessage(null)

    try {
      await acceptInvitationMutation.mutateAsync(invitation.id)
      setSuccessMessage(
        'Invitation accepted. You can now switch to this company.',
      )
    } catch {
      return
    }
  }

  async function handleRejectInvitation(invitation: CompanyInvitation) {
    setSuccessMessage(null)

    try {
      await rejectInvitationMutation.mutateAsync(invitation.id)
      setSuccessMessage('Invitation rejected.')
    } catch {
      return
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          Invitations
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Review company invitations sent to your account.
        </p>
      </div>

      {successMessage ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {myInvitationsQuery.isLoading ? (
        <StateMessage title="Loading invitations">
          Fetching pending invitations for your email.
        </StateMessage>
      ) : null}

      {myInvitationsQuery.isError ? (
        <StateMessage title="Unable to load invitations">
          {getErrorMessage(myInvitationsQuery.error) ??
            'Check your connection and try again.'}
        </StateMessage>
      ) : null}

      {!myInvitationsQuery.isLoading &&
      !myInvitationsQuery.isError &&
      pendingInvitations.length === 0 ? (
        <StateMessage title="No pending invitations">
          New company invitations will appear here.
        </StateMessage>
      ) : null}

      {!myInvitationsQuery.isLoading &&
      !myInvitationsQuery.isError &&
      pendingInvitations.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {pendingInvitations.map((invitation) => {
            const isAccepting =
              acceptInvitationMutation.isPending &&
              acceptInvitationMutation.variables === invitation.id
            const isRejecting =
              rejectInvitationMutation.isPending &&
              rejectInvitationMutation.variables === invitation.id
            const isMutating =
              acceptInvitationMutation.isPending ||
              rejectInvitationMutation.isPending

            return (
              <article
                className="rounded border border-slate-200 bg-white p-4 shadow-sm"
                key={invitation.id}
              >
                <h2 className="font-medium text-slate-950">
                  {getCompanyName(invitation.company)}
                </h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
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

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    className="rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isMutating}
                    onClick={() => void handleAcceptInvitation(invitation)}
                    type="button"
                  >
                    {isAccepting ? 'Accepting' : 'Accept'}
                  </button>
                  <button
                    className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isMutating}
                    onClick={() => void handleRejectInvitation(invitation)}
                    type="button"
                  >
                    {isRejecting ? 'Rejecting' : 'Reject'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
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

type StateMessageProps = {
  children: ReactNode
  title: string
}

function StateMessage({ children, title }: StateMessageProps) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
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

  if (error instanceof Error) {
    return error.message
  }

  return 'Please try again.'
}
