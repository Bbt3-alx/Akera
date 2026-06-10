import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { AppApiError } from '../../../shared/api/types.ts'
import { useRegister } from '../hooks.ts'

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email address'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })
  const errorMessage = getErrorMessage(registerMutation.error)

  const onSubmit = handleSubmit(async (values) => {
    const email = values.email.trim()

    await registerMutation.mutateAsync({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email,
      password: values.password,
      phone: values.phone?.trim() || undefined,
    })

    navigate(`/verify-email?email=${encodeURIComponent(email)}`)
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
      <section className="w-full max-w-sm rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Register</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create your Akera account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              autoComplete="given-name"
              error={errors.firstName?.message}
              label="First name"
              registration={register('firstName')}
            />
            <FormField
              autoComplete="family-name"
              error={errors.lastName?.message}
              label="Last name"
              registration={register('lastName')}
            />
          </div>

          <FormField
            autoComplete="email"
            error={errors.email?.message}
            label="Email"
            registration={register('email')}
            type="email"
          />
          <FormField
            autoComplete="tel"
            error={errors.phone?.message}
            label="Phone"
            registration={register('phone')}
            type="tel"
          />
          <FormField
            autoComplete="new-password"
            error={errors.password?.message}
            label="Password"
            registration={register('password')}
            type="password"
          />
          <FormField
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            label="Confirm password"
            registration={register('confirmPassword')}
            type="password"
          />

          {errorMessage ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="w-full rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting || registerMutation.isPending}
            type="submit"
          >
            {isSubmitting || registerMutation.isPending
              ? 'Creating account...'
              : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link className="font-medium text-slate-950 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}

type FormFieldProps = {
  autoComplete?: string
  error?: string
  label: string
  registration: UseFormRegisterReturn
  type?: string
}

function FormField({
  autoComplete,
  error,
  label,
  registration,
  type = 'text',
}: FormFieldProps) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        type={type}
        {...registration}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof AppApiError || error instanceof Error) {
    return error.message
  }

  return 'Unable to create your account. Please try again.'
}
