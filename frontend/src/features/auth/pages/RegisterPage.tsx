import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import {
  AuthField,
  AuthNotice,
  AuthPage,
  AuthHeader,
  BrandMark,
  PrimaryButton,
} from '../../../shared/components/AuthUI.tsx'
import { getFrenchErrorMessage } from '../../../shared/utils/frenchError.ts'
import { useRegister } from '../hooks.ts'

const schema = z
  .object({
    firstName: z.string().min(1, 'Le prénom est requis.'),
    lastName: z.string().min(1, 'Le nom est requis.'),
    email: z.string().email('Saisissez une adresse e-mail valide.'),
    password: z.string().min(8, 'Utilisez au moins 8 caractères.'),
    confirm: z.string().min(1, 'Confirmez votre mot de passe.'),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  })
type Values = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const mutation = useRegister()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirm: '',
    },
  })

  const submit = handleSubmit(async (values) => {
    const email = values.email.trim()
    await mutation.mutateAsync({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email,
      password: values.password,
    })
    navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
      replace: true,
    })
  })

  return (
    <AuthPage>
      <BrandMark label="Akera Financial" showLabel={false} />
      <AuthHeader
        subtitle="Rejoignez Akera Financial pour gérer vos opérations d’entreprise."
        title="Créer un compte"
      />
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-form-row">
          <AuthField
            error={errors.firstName?.message}
            icon={UserRound}
            id="firstName"
            label="Prénom"
            {...register('firstName')}
          />
          <AuthField
            error={errors.lastName?.message}
            icon={UserRound}
            id="lastName"
            label="Nom"
            {...register('lastName')}
          />
        </div>
        <AuthField
          error={errors.email?.message}
          icon={Mail}
          id="register-email"
          label="Adresse e-mail"
          type="email"
          {...register('email')}
        />
        <AuthField
          error={errors.password?.message}
          icon={LockKeyhole}
          id="register-password"
          label="Mot de passe"
          type="password"
          {...register('password')}
        />
        <AuthField
          error={errors.confirm?.message}
          icon={LockKeyhole}
          id="confirm-password"
          label="Confirmer le mot de passe"
          type="password"
          {...register('confirm')}
        />
        {mutation.error ? (
          <AuthNotice>{getFrenchErrorMessage(mutation.error)}</AuthNotice>
        ) : null}
        <PrimaryButton disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Création…' : 'Créer mon compte'}
        </PrimaryButton>
      </form>
      <p className="auth-footer">
        <Link className="text-xl font-semibold text-black" to="/login">
          J’ai déjà un compte
        </Link>
      </p>
      <p className="auth-footer text-xs leading-5">
        En créant un compte, vous acceptez nos{' '}
        <Link className="auth-secondary-link" to="/terms">
          Conditions d’utilisation
        </Link>{' '}
        et notre{' '}
        <Link className="auth-secondary-link" to="/privacy">
          Politique de confidentialité
        </Link>
        .
      </p>
    </AuthPage>
  )
}
