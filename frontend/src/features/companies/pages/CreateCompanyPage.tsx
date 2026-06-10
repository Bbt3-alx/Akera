import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { AUTH_ME_QUERY_KEY } from '../../auth/hooks.ts'
import { AppApiError } from '../../../shared/api/types.ts'
import { useCompaniesStore } from '../store.ts'
import { useCreateCompany } from '../hooks.ts'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  contact: z.string().min(1, 'Contact is required'),
  baseCurrency: z.enum(['FCFA', 'GNF']),
})

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>

export function CreateCompanyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createCompanyMutation = useCreateCompany()
  const setActiveCompanyId = useCompaniesStore(
    (state) => state.setActiveCompanyId,
  )
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: '',
      address: '',
      contact: '',
      baseCurrency: 'FCFA',
    },
  })
  const errorMessage = getErrorMessage(createCompanyMutation.error)

  const onSubmit = handleSubmit(async (values) => {
    const response = await createCompanyMutation.mutateAsync(values)

    setActiveCompanyId(response.membership.companyId)
    await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    navigate('/app', { replace: true })
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
      <section className="w-full max-w-lg rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Create company</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set up your company workspace to start using Akera.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <FormField
            error={errors.name?.message}
            label="Company name"
            registration={register('name')}
          />
          <FormField
            error={errors.address?.message}
            label="Address"
            registration={register('address')}
          />
          <FormField
            error={errors.contact?.message}
            label="Contact"
            registration={register('contact')}
          />

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="baseCurrency"
            >
              Base currency
            </label>
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              id="baseCurrency"
              {...register('baseCurrency')}
            >
              <option value="FCFA">FCFA</option>
              <option value="GNF">GNF</option>
            </select>
            {errors.baseCurrency ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.baseCurrency.message}
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
            disabled={isSubmitting || createCompanyMutation.isPending}
            type="submit"
          >
            {isSubmitting || createCompanyMutation.isPending
              ? 'Creating...'
              : 'Create company'}
          </button>
        </form>

        <Link
          className="mt-6 inline-flex text-sm font-medium text-slate-700 hover:text-slate-950 hover:underline"
          to="/select-company"
        >
          Back to company access
        </Link>
      </section>
    </main>
  )
}

type FormFieldProps = {
  error?: string
  label: string
  registration: UseFormRegisterReturn
}

function FormField({ error, label, registration }: FormFieldProps) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        type="text"
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

  return 'Unable to create company. Please try again.'
}
