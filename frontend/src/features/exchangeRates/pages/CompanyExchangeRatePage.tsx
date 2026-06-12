import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import {
  useCurrentExchangeRate,
  useUpdateExchangeRate,
} from '../hooks.ts'
import type { CompanyExchangeRate } from '../types.ts'

const exchangeRateSchema = z.object({
  rate: z
    .number({ error: 'Rate is required' })
    .refine(Number.isFinite, 'Rate must be a finite number')
    .positive('Rate must be greater than 0'),
})

type ExchangeRateFormValues = z.infer<typeof exchangeRateSchema>

export function CompanyExchangeRatePage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const activeMembership = meQuery.data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const isManager = activeMembership?.role === 'manager'
  const exchangeRateQuery = useCurrentExchangeRate(isManager)
  const updateExchangeRateMutation = useUpdateExchangeRate()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const currentExchangeRate = exchangeRateQuery.data ?? null
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(exchangeRateSchema),
  })
  const isCheckingAccess = Boolean(activeCompanyId) && meQuery.isLoading
  const isSaving = isSubmitting || updateExchangeRateMutation.isPending
  const updateError = getErrorMessage(updateExchangeRateMutation.error)

  useEffect(() => {
    if (currentExchangeRate) {
      reset({ rate: currentExchangeRate.rate })
    }
  }, [currentExchangeRate, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)

    try {
      const updatedRate = await updateExchangeRateMutation.mutateAsync({
        rate: values.rate,
      })

      reset({ rate: updatedRate.rate })
      setSuccessMessage('Exchange rate updated.')
    } catch {
      return
    }
  })

  if (isCheckingAccess) {
    return (
      <StateMessage title="Checking access">
        Confirming your selected company membership.
      </StateMessage>
    )
  }

  if (meQuery.isError) {
    return (
      <StateMessage title="Unable to confirm access">
        {getErrorMessage(meQuery.error) ?? 'Refresh the page and try again.'}
      </StateMessage>
    )
  }

  if (!activeCompanyId) {
    return (
      <StateMessage title="No company selected">
        Select a company before configuring exchange rates.
      </StateMessage>
    )
  }

  if (!isManager) {
    return (
      <StateMessage title="Only managers can configure exchange rates.">
        Your active company role cannot update this company rate.
      </StateMessage>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          Exchange rate
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Configure the company conversion rate used for partner transactions.
        </p>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        {exchangeRateQuery.isLoading ? (
          <RateSummaryState title="Loading exchange rate">
            Fetching the current company rate.
          </RateSummaryState>
        ) : null}

        {exchangeRateQuery.isError ? (
          <RateSummaryState title="Unable to load exchange rate">
            {getErrorMessage(exchangeRateQuery.error) ??
              'Check your connection and try again.'}
          </RateSummaryState>
        ) : null}

        {!exchangeRateQuery.isLoading && !exchangeRateQuery.isError ? (
          currentExchangeRate ? (
            <RateSummary exchangeRate={currentExchangeRate} />
          ) : (
            <RateSummaryState title="No exchange rate configured yet.">
              Create a company rate before partners submit transactions.
            </RateSummaryState>
          )
        ) : null}
      </div>

      <form
        className="max-w-xl rounded border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={onSubmit}
      >
        <FormField
          error={errors.rate?.message}
          label="GNF value for 5000 FCFA"
          registration={register('rate', {
            setValueAs: toOptionalNumber,
          })}
          type="number"
        />

        {updateError ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {updateError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </p>
        ) : null}

        <button
          className="mt-6 h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Saving rate' : 'Save rate'}
        </button>
      </form>
    </section>
  )
}

type RateSummaryProps = {
  exchangeRate: CompanyExchangeRate
}

function RateSummary({ exchangeRate }: RateSummaryProps) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">Current rate</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">
        5000 FCFA = {formatNumber(exchangeRate.rate)} GNF
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Last updated: {formatDate(exchangeRate.updatedAt)}
      </p>
    </div>
  )
}

type StateMessageProps = {
  children: ReactNode
  title: string
}

function StateMessage({ children, title }: StateMessageProps) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
      <h1 className="text-sm font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function RateSummaryState({ children, title }: StateMessageProps) {
  return (
    <div className="py-8 text-center">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

type FormFieldProps = {
  error?: string
  label: string
  registration: UseFormRegisterReturn
  type?: 'number' | 'text'
}

function FormField({
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
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        type={type}
        {...registration}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

function toOptionalNumber(value: unknown) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined
  }

  return Number(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Please try again.'
}
