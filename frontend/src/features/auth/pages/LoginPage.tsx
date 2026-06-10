import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AppApiError } from '../../../shared/api/types.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useLogin } from '../hooks.ts'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

type LoginLocationState = {
  message?: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLogin()
  const setActiveCompanyId = useCompaniesStore(
    (state) => state.setActiveCompanyId,
  )
  const clearActiveCompanyId = useCompaniesStore(
    (state) => state.clearActiveCompanyId,
  )
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })
  const errorMessage = getLoginErrorMessage(loginMutation.error)
  const loginMessage = (location.state as LoginLocationState | null)?.message

  const onSubmit = handleSubmit(async (values) => {
    const email = values.email.trim()

    try {
      const authPayload = await loginMutation.mutateAsync({
        email,
        password: values.password,
      })
      const [membership] = authPayload.memberships

      if (authPayload.memberships.length === 1 && membership) {
        setActiveCompanyId(membership.companyId)
        navigate('/app')
        return
      }

      clearActiveCompanyId()
      navigate('/select-company')
    } catch (error) {
      if (
        error instanceof AppApiError &&
        error.errorCode === 'EMAIL_NOT_VERIFIED'
      ) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`)
      }
    }
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
      <section className="w-full max-w-sm rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to continue to Akera.
        </p>

        {loginMessage ? (
          <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {loginMessage}
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              id="email"
              type="email"
              {...register('email')}
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              id="password"
              type="password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="w-full rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting || loginMutation.isPending}
            type="submit"
          >
            {isSubmitting || loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{' '}
          <Link className="font-medium text-slate-950 hover:underline" to="/register">
            Register
          </Link>
        </p>
      </section>
    </main>
  )
}

function getLoginErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (
    error instanceof AppApiError &&
    error.errorCode === 'EMAIL_NOT_VERIFIED'
  ) {
    return null
  }

  if (error instanceof AppApiError || error instanceof Error) {
    return error.message
  }

  return 'Unable to sign in. Please try again.'
}
