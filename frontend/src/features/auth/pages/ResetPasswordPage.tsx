import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import {
  AuthField,
  AuthHeader,
  AuthNotice,
  AuthPage,
  PrimaryButton,
} from '../../../shared/components/AuthUI.tsx'
import { getFrenchErrorMessage } from '../../../shared/utils/frenchError.ts'
import { useResetPassword } from '../hooks.ts'

const schema = z
  .object({
    password: z.string().min(8, 'Utilisez au moins 8 caractères.'),
    confirm: z.string().min(1, 'Confirmez votre nouveau mot de passe.'),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  })

export function ResetPasswordPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const mutation = useResetPassword()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  return (
    <AuthPage>
      <AuthHeader
        icon={KeyRound}
        subtitle="Choisissez un mot de passe unique d’au moins 8 caractères."
        title="Créer un nouveau mot de passe"
      />
      <form
        className="auth-form"
        onSubmit={handleSubmit(async ({ password }) => {
          await mutation.mutateAsync({ token, password })
          navigate('/login', {
            replace: true,
            state: { message: 'Mot de passe modifié. Vous pouvez vous connecter.' },
          })
        })}
      >
        <AuthField
          error={errors.password?.message}
          icon={LockKeyhole}
          id="new-password"
          label="Nouveau mot de passe"
          type="password"
          {...register('password')}
        />
        <AuthField
          error={errors.confirm?.message}
          icon={LockKeyhole}
          id="confirm-new-password"
          label="Confirmer le mot de passe"
          type="password"
          {...register('confirm')}
        />
        {mutation.error ? (
          <AuthNotice>{getFrenchErrorMessage(mutation.error)}</AuthNotice>
        ) : null}
        <PrimaryButton disabled={!token || isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Mise à jour…' : 'Modifier le mot de passe'}
        </PrimaryButton>
      </form>
    </AuthPage>
  )
}
