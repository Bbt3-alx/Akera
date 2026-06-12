import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useTransactions } from '../hooks.ts'
import type {
  TransactionCurrency,
  TransactionStatus,
} from '../types.ts'

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Canceled', value: 'canceled' },
  { label: 'Reversed', value: 'reversed' },
] as const

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

type StatusFilter = (typeof STATUS_FILTERS)[number]['value']

export function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const status = statusFilter === 'all' ? undefined : statusFilter
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const { data: me } = useMe()
  const { data, error, isError, isFetching, isLoading, refetch } =
    useTransactions({
      page: 1,
      limit: 10,
      status,
    })
  const transactions = data?.data ?? []
  const totalTransactions = data?.pagination?.total
  const activeMembership = me?.memberships.find(
    (membership) => membership.companyId === activeCompanyId,
  )
  const canCreateTransaction =
    activeMembership?.role === 'partner' && activeMembership.status === 'active'

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Transactions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review recent company transactions and filter them by status.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canCreateTransaction ? (
            <Link
              className="inline-flex h-10 items-center rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              to="/app/transactions/new"
            >
              New transaction
            </Link>
          ) : null}

          <Link
            className="inline-flex h-10 items-center rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            to="/app/transactions/search"
          >
            Search by code
          </Link>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Status
            <select
              className="h-10 min-w-40 rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              value={statusFilter}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="h-10 rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFetching}
            onClick={() => void refetch()}
            type="button"
          >
            {isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
          Showing up to 10 transactions
          {typeof totalTransactions === 'number'
            ? ` of ${totalTransactions}`
            : ''}
        </div>

        {isLoading ? (
          <StateMessage title="Loading transactions">
            Fetching the latest company transactions.
          </StateMessage>
        ) : null}

        {isError ? (
          <StateMessage title="Unable to load transactions">
            {getErrorMessage(error)}
          </StateMessage>
        ) : null}

        {!isLoading && !isError && transactions.length === 0 ? (
          <StateMessage title="No transactions found">
            Transactions matching this filter will appear here.
          </StateMessage>
        ) : null}

        {!isLoading && !isError && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Beneficiary</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created at</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                      {transaction.transactionCode}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {transaction.partner?.name || 'Unknown partner'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {transaction.beneficiaryName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatAmount(
                        transaction.companyAmount,
                        transaction.companyCurrency,
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={[
                          'inline-flex rounded px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset',
                          STATUS_STYLES[transaction.status],
                        ].join(' ')}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        className="inline-flex h-8 items-center rounded border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        to={`/app/transactions/${encodeURIComponent(
                          transaction.transactionCode,
                        )}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  )
}

type StateMessageProps = {
  children: ReactNode
  title: string
}

function StateMessage({ children, title }: StateMessageProps) {
  return (
    <div className="px-4 py-12 text-center">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
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
    : 'Check your connection and try again.'
}
