import { Building2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  AuthHeader,
  AuthNotice,
  AuthPage,
  PrimaryButton,
  SecondaryLink,
} from '../../../shared/components/AuthUI.tsx'
import { getFrenchErrorMessage } from '../../../shared/utils/frenchError.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import {
  useAcceptInvitation,
  useRejectInvitation,
  useResolvedInvitation,
} from '../hooks.ts'
import type { InvitationCompany, InvitationUserReference } from '../types.ts'

export function InvitationDetailPage() {
  const { credential = '' } = useParams()
  const navigate = useNavigate()
  const setCompany = useCompaniesStore((state) => state.setActiveCompanyId)
  const query = useResolvedInvitation(credential)
  const accept = useAcceptInvitation()
  const reject = useRejectInvitation()
  const invitation = query.data

  async function handleAccept() {
    if (!invitation) return
    const result = await accept.mutateAsync(invitation.id)
    const companyId = getCompanyId(result.membership?.company)
    if (companyId) setCompany(companyId)
    navigate('/onboarding/ready', {
      replace: true,
      state: { message: 'Invitation acceptée. Votre nouvel espace est accessible.' },
    })
  }

  async function handleReject() {
    if (!invitation) return
    await reject.mutateAsync(invitation.id)
    navigate('/welcome', { replace: true })
  }

  return (
    <AuthPage>
      <AuthHeader
        icon={Building2}
        subtitle="Invitation à rejoindre une équipe"
        title="Akera Financial"
      />
      {query.isLoading ? <AuthNotice tone="info">Chargement…</AuthNotice> : null}
      {query.error ? (
        <AuthNotice>{getFrenchErrorMessage(query.error)}</AuthNotice>
      ) : null}
      {invitation ? (
        <>
          <p className="mb-6 text-center text-slate-700">
            Vous avez été invité(e) à rejoindre l’espace de travail de{' '}
            <strong>{getCompanyName(invitation.company)}</strong>.
          </p>
          <dl className="divide-y divide-slate-300 rounded border border-slate-300 bg-slate-50 px-5">
            <Detail label="Nom de l’entreprise" value={getCompanyName(invitation.company)} />
            <Detail label="Rôle invité" value={invitation.role === 'partner' ? 'Partenaire' : 'Employé'} />
            <Detail label="Invité par" value={getInviter(invitation.invitedBy)} />
            <Detail label="E-mail de destination" value={invitation.email} />
          </dl>
          {(accept.error || reject.error) ? (
            <div className="mt-5">
              <AuthNotice>
                {getFrenchErrorMessage(accept.error ?? reject.error)}
              </AuthNotice>
            </div>
          ) : null}
          <div className="mt-7 grid gap-3">
            <PrimaryButton
              disabled={accept.isPending || reject.isPending}
              onClick={() => void handleAccept()}
            >
              {accept.isPending ? 'Acceptation…' : 'Accepter l’invitation'}
            </PrimaryButton>
            <button
              className="auth-ghost"
              disabled={accept.isPending || reject.isPending}
              onClick={() => void handleReject()}
              type="button"
            >
              {reject.isPending ? 'Refus…' : 'Refuser'}
            </button>
          </div>
        </>
      ) : null}
      <p className="auth-footer">
        <SecondaryLink to="/welcome">Retour à l’accueil</SecondaryLink>
      </p>
    </AuthPage>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium text-slate-950">{value}</dd>
    </div>
  )
}

function getCompanyName(company: InvitationCompany) {
  return typeof company === 'string' ? 'Entreprise Akera' : company.name
}

function getCompanyId(company: InvitationCompany | undefined) {
  return typeof company === 'object' ? company.id : company
}

function getInviter(inviter?: InvitationUserReference) {
  if (!inviter) return 'Un responsable de l’entreprise'
  return typeof inviter === 'string'
    ? 'Un responsable de l’entreprise'
    : inviter.name ?? inviter.email ?? 'Un responsable de l’entreprise'
}
