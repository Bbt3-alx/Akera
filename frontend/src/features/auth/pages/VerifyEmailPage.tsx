import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import {
  AuthField,
  AuthHeader,
  AuthNotice,
  AuthPage,
  PrimaryButton,
} from '../../../shared/components/AuthUI.tsx'
import { getFrenchErrorMessage } from '../../../shared/utils/frenchError.ts'
import { useResendVerification, useVerifyEmail } from '../hooks.ts'

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Saisissez le code à 6 chiffres.'),
})

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email')?.trim() ?? ''
  const [sent, setSent] = useState(false)
  const verify = useVerifyEmail()
  const resend = useResendVerification()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  })

  const submit = handleSubmit(async ({ code }) => {
    await verify.mutateAsync({ code })
    navigate('/welcome', { replace: true })
  })

  async function handleResend() {
    if (!email) return
    await resend.mutateAsync({ email })
    setSent(true)
  }

  return (
    <AuthPage>
      <AuthHeader
        icon={MailCheck}
        subtitle={
          <>
            Nous avons envoyé un code de confirmation à{' '}
            <strong>{email || 'votre adresse'}</strong>. Il expire dans 15
            minutes.
          </>
        }
        title="Vérifiez votre adresse e-mail"
      />
      <form className="auth-form" onSubmit={submit}>
        <AuthField
          autoComplete="one-time-code"
          error={errors.code?.message}
          id="verification-code"
          inputMode="numeric"
          label="Code de vérification"
          maxLength={6}
          placeholder="000000"
          {...register('code')}
        />
        {verify.error ? (
          <AuthNotice>{getFrenchErrorMessage(verify.error)}</AuthNotice>
        ) : null}
        {sent ? (
          <AuthNotice tone="success">Un nouveau code a été envoyé.</AuthNotice>
        ) : null}
        {resend.error ? (
          <AuthNotice>{getFrenchErrorMessage(resend.error)}</AuthNotice>
        ) : null}
        <PrimaryButton disabled={isSubmitting || verify.isPending}>
          {verify.isPending ? 'Vérification…' : 'Vérifier mon adresse'}
        </PrimaryButton>
        <button
          className="auth-ghost"
          disabled={!email || resend.isPending}
          onClick={() => void handleResend()}
          type="button"
        >
          {resend.isPending ? 'Envoi…' : 'Renvoyer le code'}
        </button>
      </form>
      <p className="auth-footer">
        <Link className="auth-secondary-link" to="/login">
          Retour à la connexion
        </Link>
      </p>
      <div className="auth-divider" />
      <p className="text-center text-xs font-semibold tracking-[.13em]">
        AKERA FINANCIAL
      </p>
    </AuthPage>
  )
}
