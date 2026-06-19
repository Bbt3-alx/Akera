import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  useForm,
  useWatch,
  type UseFormRegisterReturn,
} from 'react-hook-form'
import { z } from 'zod'

import { AUTH_ME_QUERY_KEY } from '../../auth/hooks.ts'
import { AppApiError } from '../../../shared/api/types.ts'
import { toCreateCompanyPayload } from '../onboarding.ts'
import { useCompaniesStore } from '../store.ts'
import { useCreateCompany } from '../hooks.ts'
import type { TransferWorkflowSelection } from '../types.ts'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  contact: z.string().min(1, 'Contact is required'),
  baseCurrency: z.enum(['FCFA', 'GNF']),
  businessType: z.enum(['transfer', 'gold_trading', 'mixed']),
  transferWorkflowSelection: z.enum([
    'correspondent_collection',
    'remote_agent_payout',
    'both',
  ]),
})

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>

type CreateCompanyPageProps = {
  variant?: 'standalone' | 'embedded'
}

export function CreateCompanyPage({
  variant = 'standalone',
}: CreateCompanyPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createCompanyMutation = useCreateCompany()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const setActiveCompanyId = useCompaniesStore(
    (state) => state.setActiveCompanyId,
  )
  const {
    control,
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
      businessType: 'transfer',
      transferWorkflowSelection: 'correspondent_collection',
    },
  })
  const selectedBusinessType = useWatch({
    control,
    name: 'businessType',
  })
  const errorMessage = getErrorMessage(createCompanyMutation.error)
  const isEmbedded = variant === 'embedded'
  const backLinkTo =
    isEmbedded && activeCompanyId ? '/app/dashboard' : '/select-company'
  const backLinkLabel =
    isEmbedded && activeCompanyId
      ? 'Back to dashboard'
      : 'Back to company access'

  const onSubmit = handleSubmit(async (values) => {
    const response = await createCompanyMutation.mutateAsync(
      toCreateCompanyPayload(values),
    )

    setActiveCompanyId(response.membership.companyId)
    await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    navigate('/app/dashboard', { replace: true })
  })

  const content = (
    <section className="w-full max-w-lg rounded border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Create company</h1>
      <p className="mt-2 text-sm text-slate-600">
        {isEmbedded
          ? 'Create another company workspace from your account.'
          : 'Set up your company workspace to start using Akera.'}
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            What do you want to manage with Akera?
          </legend>
          <BusinessTypeOption
            description="Transfers, correspondent collections, account operations, exchange rate, and cash."
            label="Transfers and correspondents"
            registration={register('businessType')}
            value="transfer"
          />
          <BusinessTypeOption
            description="Buy, sell, shipping, gold payments, and company cash."
            label="Gold trading"
            registration={register('businessType')}
            value="gold_trading"
          />
          <BusinessTypeOption
            description="Both transfer/correspondent workflows and gold trading workflows."
            label="Both"
            registration={register('businessType')}
            value="mixed"
          />
          {errors.businessType ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.businessType.message}
            </p>
          ) : null}
        </fieldset>

        {selectedBusinessType === 'transfer' ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Which transfer workflow applies?
            </legend>
            <TransferWorkflowOption
              description="Correspondents collect money and initiate transactions. Example: Kalil collects GNF, Abdoulaye pays FCFA."
              label="Correspondent collection"
              registration={register('transferWorkflowSelection')}
              value="correspondent_collection"
            />
            <TransferWorkflowOption
              description="Managers initiate transactions and remote agents or employees pay beneficiaries. Example: Adama initiates in Guinea, Bamako agents pay in FCFA."
              label="Remote agent payout"
              registration={register('transferWorkflowSelection')}
              value="remote_agent_payout"
            />
            <TransferWorkflowOption
              description="Enable correspondent collection and remote agent payout workflows."
              label="Both"
              registration={register('transferWorkflowSelection')}
              value="both"
            />
            {errors.transferWorkflowSelection ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.transferWorkflowSelection.message}
              </p>
            ) : null}
          </fieldset>
        ) : null}

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
        to={backLinkTo}
      >
        {backLinkLabel}
      </Link>
    </section>
  )

  if (isEmbedded) {
    return content
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
      {content}
    </main>
  )
}

type TransferWorkflowOptionProps = {
  description: string
  label: string
  registration: UseFormRegisterReturn
  value: TransferWorkflowSelection
}

function TransferWorkflowOption({
  description,
  label,
  registration,
  value,
}: TransferWorkflowOptionProps) {
  return (
    <label className="flex cursor-pointer gap-3 rounded border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50">
      <input
        className="mt-1"
        type="radio"
        value={value}
        {...registration}
      />
      <span>
        <span className="block text-sm font-medium text-slate-900">
          {label}
        </span>
        <span className="mt-1 block text-sm text-slate-600">
          {description}
        </span>
      </span>
    </label>
  )
}

type BusinessTypeOptionProps = {
  description: string
  label: string
  registration: UseFormRegisterReturn
  value: CreateCompanyFormValues['businessType']
}

function BusinessTypeOption({
  description,
  label,
  registration,
  value,
}: BusinessTypeOptionProps) {
  return (
    <label className="flex cursor-pointer gap-3 rounded border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50">
      <input
        className="mt-1"
        type="radio"
        value={value}
        {...registration}
      />
      <span>
        <span className="block text-sm font-medium text-slate-900">
          {label}
        </span>
        <span className="mt-1 block text-sm text-slate-600">
          {description}
        </span>
      </span>
    </label>
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
