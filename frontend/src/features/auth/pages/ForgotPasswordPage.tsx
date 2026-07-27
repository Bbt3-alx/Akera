import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  AuthField,
  AuthHeader,
  AuthNotice,
  AuthPage,
  PrimaryButton,
  SecondaryLink,
} from '../../../shared/components/AuthUI.tsx'
import { getFrenchErrorMessage } from '../../../shared/utils/frenchError.ts'
import { useForgotPassword } from '../hooks.ts'

const schema = z.object({
  email: z.string().email('Saisissez une adresse e-mail valide.'),
})

export function ForgotPasswordPage() {
  const mutation = useForgotPassword()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  return (
    <AuthPage>
      <AuthHeader
        icon={KeyRound}
        subtitle="Indiquez l’adresse liée à votre compte. Si elle existe, nous vous enverrons un lien sécurisé."
        title="Mot de passe oublié"
      />
      <form
        className="auth-form"
        onSubmit={handleSubmit((values) =>
          mutation.mutateAsync({ email: values.email.trim() }),
        )}
      >
        <AuthField
          error={errors.email?.message}
          icon={Mail}
          id="recovery-email"
          label="Adresse e-mail"
          type="email"
          {...register('email')}
        />
        {mutation.isSuccess ? (
          <AuthNotice tone="success">
            Si cette adresse correspond à un compte, le lien vient d’être
            envoyé.
          </AuthNotice>
        ) : null}
        {mutation.error ? (
          <AuthNotice>{getFrenchErrorMessage(mutation.error)}</AuthNotice>
        ) : null}
        <PrimaryButton disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Envoi…' : 'Envoyer le lien'}
        </PrimaryButton>
      </form>
      <p className="auth-footer">
        <SecondaryLink to="/login">Retour à la connexion</SecondaryLink>
      </p>
    </AuthPage>
  )
}
