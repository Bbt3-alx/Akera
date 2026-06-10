import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AppApiError } from '../../../shared/api/types.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useVerifyEmail } from '../hooks.ts'

const verifyEmailSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
})

type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')
  const verifyEmailMutation = useVerifyEmail()
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
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: '',
    },
  })
  const errorMessage = getErrorMessage(verifyEmailMutation.error)

  const onSubmit = handleSubmit(async (values) => {
    const authPayload = await verifyEmailMutation.mutateAsync({
      code: values.code,
    })
    const [membership] = authPayload.memberships

    if (authPayload.memberships.length === 1 && membership) {
      setActiveCompanyId(membership.companyId)
      navigate('/app', { replace: true })
      return
    }

    clearActiveCompanyId()
    navigate('/select-company', { replace: true })
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
      <section className="w-full max-w-sm rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Verify email</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter the 6-digit code sent to {email || 'your email'}.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="code"
            >
              Verification code
            </label>
            <input
              autoComplete="one-time-code"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm tracking-widest outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              id="code"
              inputMode="numeric"
              maxLength={6}
              {...register('code')}
            />
            {errors.code ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.code.message}
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
            disabled={isSubmitting || verifyEmailMutation.isPending}
            type="submit"
          >
            {isSubmitting || verifyEmailMutation.isPending
              ? 'Verifying...'
              : 'Verify email'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already verified?{' '}
          <Link className="font-medium text-slate-950 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof AppApiError || error instanceof Error) {
    return error.message
  }

  return 'Unable to verify your email. Please try again.'
}
