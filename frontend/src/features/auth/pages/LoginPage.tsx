import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import {
  AuthField,
  AuthNotice,
  AuthPage,
  BrandMark,
  PrimaryButton,
} from '../../../shared/components/AuthUI.tsx'
import { AppApiError } from '../../../shared/api/types.ts'
import { getFrenchErrorMessage } from '../../../shared/utils/frenchError.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useLogin } from '../hooks.ts'
import { getSafeReturnTo } from '../navigation.ts'

const schema = z.object({
  email: z.string().email('Saisissez une adresse e-mail valide.'),
  password: z.string().min(1, 'Le mot de passe est requis.'),
  remember: z.boolean(),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const mutation = useLogin()
  const setCompany = useCompaniesStore((state) => state.setActiveCompanyId)
  const clearCompany = useCompaniesStore((state) => state.clearActiveCompanyId)
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const message = (location.state as { message?: string } | null)?.message
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: true },
  })

  const submit = handleSubmit(async (values) => {
    const email = values.email.trim()
    try {
      const payload = await mutation.mutateAsync({
        email,
        password: values.password,
        remember: values.remember,
      })
      if (returnTo) {
        navigate(returnTo, { replace: true })
        return
      }
      const [membership] = payload.memberships
      if (payload.memberships.length === 1 && membership) {
        setCompany(membership.companyId)
        navigate('/app', { replace: true })
      } else {
        clearCompany()
        navigate(payload.memberships.length ? '/select-company' : '/welcome', {
          replace: true,
        })
      }
    } catch (error) {
      if (
        error instanceof AppApiError &&
        error.errorCode === 'EMAIL_NOT_VERIFIED'
      ) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
          replace: true,
        })
      }
    }
  })

  return (
    <AuthPage>
      <BrandMark showIcon={false} />
      <div className="auth-header" style={{ marginTop: 16 }}>
        <p style={{ marginTop: 0 }}>Accès sécurisé à votre espace</p>
      </div>
      {message ? <AuthNotice tone="success">{message}</AuthNotice> : null}
      <form className="auth-form" onSubmit={submit}>
        <AuthField
          autoComplete="email"
          error={errors.email?.message}
          icon={Mail}
          id="email"
          label="Adresse e-mail"
          placeholder="nom@entreprise.com"
          type="email"
          {...register('email')}
        />
        <AuthField
          autoComplete="current-password"
          error={errors.password?.message}
          icon={LockKeyhole}
          id="password"
          label="Mot de passe"
          placeholder="••••••••"
          type="password"
          {...register('password')}
        />
        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            <input type="checkbox" {...register('remember')} />
            Se souvenir de moi
          </label>
          <Link className="auth-secondary-link" to="/forgot-password">
            Mot de passe oublié ?
          </Link>
        </div>
        {mutation.error ? (
          <AuthNotice>{getFrenchErrorMessage(mutation.error)}</AuthNotice>
        ) : null}
        <PrimaryButton disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Connexion…' : 'Se connecter'}{' '}
          <ArrowRight aria-hidden="true" className="inline ml-2" size={20} />
        </PrimaryButton>
      </form>
      <div className="auth-notice auth-notice--info mt-7 flex items-center justify-center gap-3 text-center">
        <ShieldCheck color="#075dcc" size={23} />
        Sécurité renforcée pour vos opérations financières
      </div>
      <div className="auth-divider" />
      <p className="auth-footer">
        Nouveau sur Akera ?{' '}
        <Link className="auth-secondary-link" to="/register">
          Créer un compte
        </Link>
      </p>
    </AuthPage>
  )
}
