import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { AppApiError } from '../../../shared/api/types.ts'
import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import {
  useCompanyCash,
  useCreateCompanyCashDeposit,
} from '../hooks.ts'
import type {
  CompanyCashDepositResponse,
  CompanyCashCurrency,
} from '../types.ts'

const PIN_PATTERN = /^\d{6}$/
const currencyOptions = ['FCFA', 'GNF'] as const
const methodOptions = ['cash', 'bank', 'mobile_money', 'other'] as const

const companyCashDepositSchema = z.object({
  amount: z
    .number({ error: 'Amount is required' })
    .refine(Number.isFinite, 'Amount must be a finite number')
    .positive('Amount must be greater than 0'),
  currency: z.enum(currencyOptions, { error: 'Currency is required' }),
  method: z.enum(methodOptions, { error: 'Method is required' }),
  reference: z
    .string()
    .trim()
    .max(100, 'Reference must be 100 characters or fewer')
    .optional(),
  note: z
    .string()
    .trim()
    .max(300, 'Note must be 300 characters or fewer')
    .optional(),
  transactionPin: z
    .string()
    .regex(PIN_PATTERN, 'Transaction PIN must contain exactly 6 digits'),
})

type CompanyCashDepositFormValues = z.infer<typeof companyCashDepositSchema>

export function CompanyCashPage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const activeMembership = meQuery.data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const isManager = activeMembership?.role === 'manager'
  const companyCashQuery = useCompanyCash(isManager)
  const isCheckingAccess = Boolean(activeCompanyId) && meQuery.isLoading

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
        Select a company before managing company cash.
      </StateMessage>
    )
  }

  if (!isManager) {
    return (
      <StateMessage title="Only managers can manage company cash.">
        Your active company role cannot record deposits.
      </StateMessage>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          Company cash
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Record manager deposits used to fund company transaction payments.
        </p>
      </div>

      {companyCashQuery.isLoading ? (
        <StateMessage title="Loading company cash">
          Fetching the current company balance.
        </StateMessage>
      ) : null}

      {companyCashQuery.isError ? (
        <StateMessage title="Unable to load company cash">
          {getErrorMessage(companyCashQuery.error) ??
            'Check your connection and try again.'}
        </StateMessage>
      ) : null}

      {!companyCashQuery.isLoading && !companyCashQuery.isError ? (
        <>
          <CashSummary
            balance={companyCashQuery.data?.balance ?? 0}
            currency={companyCashQuery.data?.currency ?? 'FCFA'}
          />
          <DepositForm
            companyCurrency={companyCashQuery.data?.currency ?? 'FCFA'}
          />
        </>
      ) : null}
    </section>
  )
}

type CashSummaryProps = {
  balance: number
  currency: CompanyCashCurrency
}

function CashSummary({ balance, currency }: CashSummaryProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Company cash</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">
        {formatAmount(balance, currency)}
      </p>
    </div>
  )
}

type DepositFormProps = {
  companyCurrency: CompanyCashCurrency
}

function DepositForm({ companyCurrency }: DepositFormProps) {
  const createDeposit = useCreateCompanyCashDeposit()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastResult, setLastResult] =
    useState<CompanyCashDepositResponse | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey)
  const [lastSubmittedSignature, setLastSubmittedSignature] =
    useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<CompanyCashDepositFormValues>({
    resolver: zodResolver(companyCashDepositSchema),
    defaultValues: {
      amount: undefined,
      currency: companyCurrency,
      method: 'cash',
      reference: '',
      note: '',
      transactionPin: '',
    },
  })
  const isSaving = isSubmitting || createDeposit.isPending
  const depositError = getDepositErrorMessage(createDeposit.error)
  const pinNotConfigured =
    createDeposit.error instanceof AppApiError &&
    createDeposit.error.errorCode === 'PIN_NOT_CONFIGURED'

  useEffect(() => {
    reset((values) => ({
      ...values,
      currency: companyCurrency,
      transactionPin: '',
    }))
  }, [companyCurrency, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)
    setLastResult(null)
    createDeposit.reset()

    const signature = createDepositSignature(values)
    const submitKey =
      lastSubmittedSignature === signature
        ? idempotencyKey
        : createIdempotencyKey()

    setIdempotencyKey(submitKey)
    setLastSubmittedSignature(signature)

    try {
      const result = await createDeposit.mutateAsync({
        amount: values.amount,
        currency: values.currency,
        method: values.method,
        reference: toOptionalString(values.reference),
        note: toOptionalString(values.note),
        transactionPin: values.transactionPin,
        idempotencyKey: submitKey,
      })

      setSuccessMessage('Deposit recorded.')
      setLastResult(result)
      setIdempotencyKey(createIdempotencyKey())
      setLastSubmittedSignature(null)
      const resultBalance = getDepositBalance(result)

      reset({
        amount: undefined,
        currency: resultBalance?.currency ?? values.currency,
        method: 'cash',
        reference: '',
        note: '',
        transactionPin: '',
      })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  const successBalance = getDepositBalance(lastResult)

  return (
    <form
      className="max-w-xl rounded border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={onSubmit}
    >
      <h2 className="text-lg font-semibold text-slate-950">Record deposit</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <FormField
          error={errors.amount?.message}
          label="Amount"
          registration={register('amount', {
            setValueAs: toOptionalNumber,
          })}
          type="number"
        />
        <SelectField
          error={errors.currency?.message}
          label="Currency"
          options={currencyOptions}
          registration={register('currency')}
        />
        <SelectField
          error={errors.method?.message}
          label="Method"
          options={methodOptions}
          registration={register('method')}
        />
        <FormField
          error={errors.reference?.message}
          label="Reference"
          registration={register('reference')}
        />
      </div>

      <div className="mt-4 space-y-4">
        <TextAreaField
          error={errors.note?.message}
          label="Note"
          registration={register('note')}
        />
        <FormField
          autoComplete="off"
          error={errors.transactionPin?.message}
          inputMode="numeric"
          label="Transaction PIN"
          registration={register('transactionPin')}
          type="password"
        />
      </div>

      {depositError ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {depositError}
          {pinNotConfigured ? (
            <>
              {' '}
              <Link
                className="font-medium underline decoration-red-400 underline-offset-2 hover:text-red-900"
                to="/app/security/transaction-pin"
              >
                Set transaction PIN
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p className="font-medium">{successMessage}</p>
          {successBalance ? (
            <dl className="mt-2 space-y-1">
              <BalanceDetail
                label="Previous balance"
                value={formatAmount(
                  successBalance.previous,
                  successBalance.currency,
                )}
              />
              <BalanceDetail
                label="Current balance"
                value={formatAmount(
                  successBalance.current,
                  successBalance.currency,
                )}
              />
            </dl>
          ) : null}
        </div>
      ) : null}

      <button
        className="mt-6 h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? 'Recording deposit' : 'Record deposit'}
      </button>
    </form>
  )
}

type BalanceDetailProps = {
  label: string
  value: string
}

function BalanceDetail({ label, value }: BalanceDetailProps) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-medium text-emerald-950">{value}</dd>
    </div>
  )
}

type FormFieldProps = {
  autoComplete?: string
  error?: string
  inputMode?: 'numeric' | 'decimal'
  label: string
  registration: UseFormRegisterReturn
  type?: 'number' | 'password' | 'text'
}

function FormField({
  autoComplete,
  error,
  inputMode,
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
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        inputMode={inputMode}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        type={type}
        {...registration}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

type SelectFieldProps<T extends string> = {
  error?: string
  label: string
  options: readonly T[]
  registration: UseFormRegisterReturn
}

function SelectField<T extends string>({
  error,
  label,
  options,
  registration,
}: SelectFieldProps<T>) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        {...registration}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOptionLabel(option)}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

type TextAreaFieldProps = {
  error?: string
  label: string
  registration: UseFormRegisterReturn
}

function TextAreaField({ error, label, registration }: TextAreaFieldProps) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="mt-1 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
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
      <h1 className="text-sm font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function createDepositSignature(values: CompanyCashDepositFormValues) {
  return JSON.stringify({
    amount: values.amount,
    currency: values.currency,
    method: values.method,
    reference: toOptionalString(values.reference) ?? '',
    note: toOptionalString(values.note) ?? '',
  })
}

function createIdempotencyKey() {
  return crypto.randomUUID()
}

function toOptionalNumber(value: unknown) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined
  }

  return Number(value)
}

function toOptionalString(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function formatAmount(value: number, currency: CompanyCashCurrency) {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`
}

function formatOptionLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getDepositBalance(result: CompanyCashDepositResponse | null) {
  const balance = (result as Partial<CompanyCashDepositResponse> | null)?.balance

  if (
    typeof balance?.previous !== 'number' ||
    typeof balance.current !== 'number' ||
    (balance.currency !== 'FCFA' && balance.currency !== 'GNF')
  ) {
    return null
  }

  return balance
}

function getDepositErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof AppApiError) {
    if (error.errorCode === 'PIN_NOT_CONFIGURED') {
      return 'Transaction PIN is not configured.'
    }

    if (error.errorCode === 'INVALID_PIN') {
      return 'Invalid transaction PIN.'
    }
  }

  return getErrorMessage(error) ?? 'Deposit failed. Try again.'
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
