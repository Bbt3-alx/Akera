import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useCreateTransaction } from '../hooks.ts'
import type {
  CreateTransactionPayload,
  Transaction,
  TransactionCurrency,
} from '../types.ts'

const CURRENCIES = ['FCFA', 'GNF'] as const

const createTransactionSchema = z.object({
  inputAmount: z
    .number({ error: 'Input amount is required' })
    .positive('Input amount must be greater than 0'),
  inputCurrency: z.enum(CURRENCIES, { error: 'Currency is required' }),
  beneficiaryName: z
    .string()
    .trim()
    .min(3, 'Beneficiary name must be at least 3 characters'),
  description: z
    .string()
    .trim()
    .max(255, 'Description must be 255 characters or fewer')
    .optional(),
})

type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>
type CreateTransactionRequest = Omit<CreateTransactionPayload, 'idempotencyKey'>
type SubmissionIdentity = {
  fingerprint: string
  idempotencyKey: string
}

const DEFAULT_FORM_VALUES = {
  inputCurrency: 'FCFA' as TransactionCurrency,
  beneficiaryName: '',
  description: '',
}

export function CreateTransactionPage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const createTransactionMutation = useCreateTransaction()
  const [submissionIdentity, setSubmissionIdentity] =
    useState<SubmissionIdentity | null>(null)
  const [createdTransaction, setCreatedTransaction] =
    useState<Transaction | null>(null)
  const activeMembership = meQuery.data?.memberships.find(
    (membership) => membership.companyId === activeCompanyId,
  )
  const canCreateTransaction =
    activeMembership?.role === 'partner' && activeMembership.status === 'active'
  const isCheckingAccess = Boolean(activeCompanyId) && meQuery.isLoading
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })
  const errorMessage = getErrorMessage(createTransactionMutation.error)
  const isPending = isSubmitting || createTransactionMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    const payload = toCreateTransactionRequest(values)
    const fingerprint = getSubmissionFingerprint(payload)
    const nextSubmissionIdentity =
      submissionIdentity?.fingerprint === fingerprint
        ? submissionIdentity
        : {
            fingerprint,
            idempotencyKey: createIdempotencyKey(),
          }

    setCreatedTransaction(null)
    setSubmissionIdentity(nextSubmissionIdentity)

    try {
      const transaction = await createTransactionMutation.mutateAsync({
        ...payload,
        idempotencyKey: nextSubmissionIdentity.idempotencyKey,
      })

      setCreatedTransaction(transaction)
      setSubmissionIdentity(null)
      reset(DEFAULT_FORM_VALUES)
    } catch {
      return
    }
  })

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            New transaction
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create a partner transaction for the selected company.
          </p>
        </div>

        <Link
          className="inline-flex h-10 items-center rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          to="/app/transactions"
        >
          Back to list
        </Link>
      </div>

      {isCheckingAccess ? (
        <StateMessage title="Checking access">
          Confirming your selected company membership.
        </StateMessage>
      ) : null}

      {!isCheckingAccess && meQuery.isError ? (
        <StateMessage title="Unable to confirm access">
          {getErrorMessage(meQuery.error) ??
            'Refresh the page and try again.'}
        </StateMessage>
      ) : null}

      {!isCheckingAccess && !meQuery.isError && !canCreateTransaction ? (
        <StateMessage title="Only partners can create transactions.">
          Managers and employees cannot create transactions in this phase.
        </StateMessage>
      ) : null}

      {!isCheckingAccess && !meQuery.isError && canCreateTransaction ? (
        <form
          className="max-w-2xl rounded border border-slate-200 bg-white p-4 shadow-sm"
          onSubmit={onSubmit}
        >
          <div className="space-y-4">
            <FormField
              error={errors.inputAmount?.message}
              label="Input amount"
              registration={register('inputAmount', {
                setValueAs: toOptionalNumber,
              })}
              type="number"
            />

            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="inputCurrency"
              >
                Input currency
              </label>
              <select
                className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                id="inputCurrency"
                {...register('inputCurrency')}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              {errors.inputCurrency ? (
                <p className="mt-1 text-sm text-red-600">
                  {errors.inputCurrency.message}
                </p>
              ) : null}
            </div>

            <FormField
              error={errors.beneficiaryName?.message}
              label="Beneficiary name"
              registration={register('beneficiaryName')}
            />

            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                className="mt-1 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                id="description"
                maxLength={255}
                {...register('description')}
              />
              {errors.description ? (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              ) : null}
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {createdTransaction ? (
            <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <p className="font-medium">
                Transaction {createdTransaction.transactionCode} created.
              </p>
              <Link
                className="mt-2 inline-flex h-9 items-center rounded bg-emerald-700 px-3 text-sm font-medium text-white transition hover:bg-emerald-800"
                to={`/app/transactions/${encodeURIComponent(
                  createdTransaction.transactionCode,
                )}`}
              >
                View details
              </Link>
            </div>
          ) : null}

          <button
            className="mt-6 h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Creating' : 'Create transaction'}
          </button>
        </form>
      ) : null}
    </section>
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

type StateMessageProps = {
  children: ReactNode
  title: string
}

function StateMessage({ children, title }: StateMessageProps) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function toCreateTransactionRequest(
  values: CreateTransactionFormValues,
): CreateTransactionRequest {
  const description = values.description?.trim()
  const payload: CreateTransactionRequest = {
    inputAmount: values.inputAmount,
    inputCurrency: values.inputCurrency,
    beneficiaryName: values.beneficiaryName.trim(),
  }

  if (description) {
    payload.description = description
  }

  return payload
}

function toOptionalNumber(value: unknown) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined
  }

  return Number(value)
}

function getSubmissionFingerprint(payload: CreateTransactionRequest) {
  return JSON.stringify([
    payload.inputAmount,
    payload.inputCurrency,
    payload.beneficiaryName,
    payload.description ?? '',
  ])
}

function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `txn-${Date.now()}-${createRandomString()}`
}

function createRandomString() {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const values = new Uint32Array(2)
    globalThis.crypto.getRandomValues(values)
    return Array.from(values, (value) => value.toString(36)).join('')
  }

  return Math.random().toString(36).slice(2, 12)
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to create transaction. Please try again.'
}
