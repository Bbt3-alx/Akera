import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { CancelTransactionButton } from '../components/CancelTransactionButton.tsx'
import { PayTransactionButton } from '../components/PayTransactionButton.tsx'
import { useTransactionByCode } from '../hooks.ts'
import type {
  TransactionCurrency,
  TransactionStatus,
} from '../types.ts'

const STATUS_STYLES: Record<TransactionStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  canceling: 'bg-orange-50 text-orange-700 ring-orange-200',
  canceled: 'bg-rose-50 text-rose-700 ring-rose-200',
  reversing: 'bg-purple-50 text-purple-700 ring-purple-200',
  reversed: 'bg-slate-100 text-slate-700 ring-slate-200',
  archived: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
}

export function TransactionSearchPage() {
  const [transactionCode, setTransactionCode] = useState('')
  const [submittedCode, setSubmittedCode] = useState<string>()
  const { data, error, isError, isFetching, refetch } =
    useTransactionByCode(submittedCode)
  const canSubmit = transactionCode.trim().length > 0 && !isFetching

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextCode = transactionCode.trim()

    if (!nextCode) {
      setSubmittedCode(undefined)
      return
    }

    if (nextCode === submittedCode) {
      void refetch()
      return
    }

    setSubmittedCode(nextCode)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Search transaction
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Enter a transaction code to look up its current company record.
          </p>
        </div>

        <Link
          className="inline-flex h-10 items-center rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          to="/app/transactions"
        >
          Back to list
        </Link>
      </div>

      <form
        className="rounded border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            Transaction code
            <input
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              onChange={(event) => setTransactionCode(event.target.value)}
              placeholder="AKR-000001"
              type="text"
              value={transactionCode}
            />
          </label>

          <button
            className="h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit}
            type="submit"
          >
            {isFetching ? 'Searching' : 'Search'}
          </button>
        </div>
      </form>

      {!submittedCode ? (
        <StateMessage title="No search yet">
          Submit a transaction code to view its details.
        </StateMessage>
      ) : null}

      {submittedCode && isFetching && !data ? (
        <StateMessage title="Searching transaction">
          Looking up {submittedCode}.
        </StateMessage>
      ) : null}

      {submittedCode && isError ? (
        <StateMessage title="Unable to find transaction">
          {getErrorMessage(error)}
        </StateMessage>
      ) : null}

      {data && !isError ? (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Result
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {data.transactionCode}
                </h2>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <StatusBadge status={data.status} />
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    to={`/app/transactions/${encodeURIComponent(
                      data.transactionCode,
                    )}`}
                  >
                    View details
                  </Link>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <PayTransactionButton transaction={data} />
                  <CancelTransactionButton transaction={data} />
                </div>
              </div>
            </div>
          </div>

          <dl className="grid gap-px bg-slate-100 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Beneficiary" value={data.beneficiaryName} />
            <DetailItem
              label="Input amount"
              value={formatAmount(data.inputAmount, data.inputCurrency)}
            />
            <DetailItem
              label="Partner amount"
              value={formatAmount(data.partnerAmount, data.partnerCurrency)}
            />
            <DetailItem
              label="Company amount"
              value={formatAmount(data.companyAmount, data.companyCurrency)}
            />
            <DetailItem label="Created" value={formatDate(data.createdAt)} />
            <DetailItem label="Status" value={data.status} />
            {data.description ? (
              <DetailItem
                className="sm:col-span-2 lg:col-span-3"
                label="Description"
                value={data.description}
              />
            ) : null}
          </dl>
        </div>
      ) : null}
    </section>
  )
}

type DetailItemProps = {
  className?: string
  label: string
  value: string
}

function DetailItem({ className, label, value }: DetailItemProps) {
  return (
    <div className={['bg-white p-4', className].filter(Boolean).join(' ')}>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
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

function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={[
        'inline-flex w-fit rounded px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset',
        STATUS_STYLES[status],
      ].join(' ')}
    >
      {status}
    </span>
  )
}

function formatAmount(amount: number, currency: TransactionCurrency) {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`
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

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Check the transaction code and try again.'
}
