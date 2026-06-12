import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CancelTransactionButton } from '../components/CancelTransactionButton.tsx'
import { PayTransactionButton } from '../components/PayTransactionButton.tsx'
import { ReverseTransactionButton } from '../components/ReverseTransactionButton.tsx'
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

export function TransactionDetailsPage() {
  const { transactionCode } = useParams<{ transactionCode: string }>()
  const decodedTransactionCode = transactionCode
    ? decodeURIComponent(transactionCode)
    : undefined
  const { data, error, isError, isLoading } = useTransactionByCode(
    decodedTransactionCode,
  )

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Transaction details
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review the full transaction record for this company.
          </p>
        </div>

        <Link
          className="inline-flex h-10 items-center rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          to="/app/transactions"
        >
          Back to list
        </Link>
      </div>

      {!decodedTransactionCode ? (
        <StateMessage title="Missing transaction code">
          This route does not include a transaction code.
        </StateMessage>
      ) : null}

      {decodedTransactionCode && isLoading ? (
        <StateMessage title="Loading transaction">
          Fetching {decodedTransactionCode}.
        </StateMessage>
      ) : null}

      {decodedTransactionCode && isError ? (
        <StateMessage title="Unable to load transaction">
          {getErrorMessage(error)}
        </StateMessage>
      ) : null}

      {decodedTransactionCode && !isLoading && !isError && !data ? (
        <StateMessage title="Transaction not found">
          No transaction was returned for {decodedTransactionCode}.
        </StateMessage>
      ) : null}

      {data && !isError ? (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Transaction
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {data.transactionCode}
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <StatusBadge status={data.status} />
                <div className="flex flex-col gap-2 sm:items-end">
                  <PayTransactionButton transaction={data} />
                  <CancelTransactionButton transaction={data} />
                  <ReverseTransactionButton transaction={data} />
                </div>
              </div>
            </div>
          </div>

          <dl className="grid gap-px bg-slate-100 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Partner" value={getPartnerName(data.partner)} />
            <DetailItem
              label="Partner email"
              value={data.partner?.email || 'Not available'}
            />
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
            {typeof data.exchangeRate === 'number' ? (
              <DetailItem
                label="Exchange rate"
                value={formatNumber(data.exchangeRate)}
              />
            ) : null}
            <DetailItem label="Created at" value={formatDate(data.createdAt)} />
            {data.processedAt ? (
              <DetailItem
                label="Processed at"
                value={formatDate(data.processedAt)}
              />
            ) : null}
            {data.canceledAt ? (
              <DetailItem
                label="Canceled at"
                value={formatDate(data.canceledAt)}
              />
            ) : null}
            {data.cancelReason ? (
              <DetailItem label="Cancel reason" value={data.cancelReason} />
            ) : null}
            {data.reversedAt ? (
              <DetailItem
                label="Reversed at"
                value={formatDate(data.reversedAt)}
              />
            ) : null}
            {data.reversedReason ? (
              <DetailItem label="Reversal reason" value={data.reversedReason} />
            ) : null}
            {data.description ? (
              <DetailItem
                className="sm:col-span-2 lg:col-span-3"
                label="Description"
                value={data.description}
              />
            ) : null}
            <DetailItem
              className="sm:col-span-2 lg:col-span-3"
              label="Transaction ID"
              value={data.id || data._id}
            />
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
      <dd className="mt-1 break-words font-medium text-slate-950">{value}</dd>
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

function getPartnerName(partner?: { name: string } | null) {
  return partner?.name || 'Unknown partner'
}

function formatAmount(amount: number, currency: TransactionCurrency) {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Check your connection and try again.'
}
