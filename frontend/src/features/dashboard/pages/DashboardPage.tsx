import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useCompaniesStore } from '../../companies/store.ts'
import { TransactionCodeDisplay } from '../../transactions/components/TransactionCodeDisplay.tsx'
import { useCompanyDashboard } from '../hooks.ts'
import type {
  CompanyDashboard,
  DashboardCurrency,
  DashboardTransaction,
  DashboardTransactionCounts,
  DashboardTransactionTotals,
} from '../types.ts'

const STATUS_ORDER = [
  'pending',
  'processing',
  'canceling',
  'completed',
  'canceled',
  'reversing',
  'reversed',
] as const

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  canceling: 'bg-orange-50 text-orange-700 ring-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  canceled: 'bg-rose-50 text-rose-700 ring-rose-200',
  reversing: 'bg-purple-50 text-purple-700 ring-purple-200',
  reversed: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export function DashboardPage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const dashboardQuery = useCompanyDashboard()
  const dashboard = dashboardQuery.data
  const isPartner = dashboard?.viewer.role === 'partner'

  if (!activeCompanyId) {
    return (
      <StateMessage title="No company selected">
        Select a company to view dashboard metrics.
      </StateMessage>
    )
  }

  if (dashboardQuery.isLoading) {
    return (
      <StateMessage title="Loading dashboard">
        Fetching your company dashboard.
      </StateMessage>
    )
  }

  if (dashboardQuery.isError) {
    return (
      <StateMessage title="Unable to load dashboard">
        {getErrorMessage(dashboardQuery.error)}
      </StateMessage>
    )
  }

  if (!dashboard) {
    return (
      <StateMessage title="Dashboard unavailable">
        No dashboard data was returned for this company.
      </StateMessage>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-slate-500">
            {dashboard.viewer.role}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {isPartner
              ? 'My transactions with this company'
              : 'Company dashboard'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {isPartner
              ? `Track your transaction activity with ${dashboard.company.name}.`
              : `Monitor ${dashboard.company.name} operational activity in ${dashboard.company.baseCurrency}.`}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="h-10 rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={dashboardQuery.isFetching}
            onClick={() => void dashboardQuery.refetch()}
            type="button"
          >
            {dashboardQuery.isFetching ? 'Refreshing' : 'Refresh'}
          </button>
          {isPartner ? (
            <Link
              className="inline-flex h-10 items-center rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              to="/app/transactions/new"
            >
              New transaction
            </Link>
          ) : (
            <Link
              className="inline-flex h-10 items-center rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              to="/app/transactions"
            >
              View transactions
            </Link>
          )}
        </div>
      </div>

      <MetricGrid dashboard={dashboard} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <TransactionSummary
            counts={dashboard.transactions.counts}
            currency={dashboard.company.baseCurrency}
            totals={dashboard.transactions.totals}
          />
          <RecentTransactions dashboard={dashboard} />
        </div>

        <div className="space-y-6">
          <ContextualActions dashboard={dashboard} />
          {dashboard.accounting.visible ? (
            <TrialBalanceSummary
              error={dashboard.accounting.error}
              trialBalance={dashboard.accounting.trialBalance}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}

function MetricGrid({ dashboard }: { dashboard: CompanyDashboard }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {dashboard.cash.visible ? (
        <MetricCard
          label="Company cash"
          value={formatAmount(dashboard.cash.balance, dashboard.cash.currency)}
        />
      ) : null}
      <MetricCard
        action={
          !dashboard.exchangeRate.configured &&
          dashboard.viewer.role === 'manager' ? (
            <Link
              className="text-xs font-medium text-slate-950 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700"
              to="/app/company/exchange-rate"
            >
              Configure rate
            </Link>
          ) : null
        }
        label="Exchange rate"
        value={
          dashboard.exchangeRate.configured
            ? `5000 FCFA = ${formatNumber(dashboard.exchangeRate.rate)} GNF`
            : 'Exchange rate not configured'
        }
      />
      <MetricCard
        label="Pending transactions"
        value={formatNumber(dashboard.transactions.counts.pending)}
      />
      <MetricCard
        label="Completed today"
        value={formatAmount(
          dashboard.transactions.totals.todayCompletedCompanyAmount,
          dashboard.company.baseCurrency,
        )}
      />
      {dashboard.invitations.visible ? (
        <MetricCard
          label="Pending invitations"
          value={formatNumber(dashboard.invitations.pendingCount)}
        />
      ) : null}
    </div>
  )
}

type MetricCardProps = {
  action?: ReactNode
  label: string
  value: string
}

function MetricCard({ action, label, value }: MetricCardProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-h-5 items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {action}
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

type TransactionSummaryProps = {
  counts: DashboardTransactionCounts
  currency: DashboardCurrency
  totals: DashboardTransactionTotals
}

function TransactionSummary({
  counts,
  currency,
  totals,
}: TransactionSummaryProps) {
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">
          Transaction status summary
        </h2>
      </div>

      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {STATUS_ORDER.map((status) => (
          <div className="bg-white p-4" key={status}>
            <p className="text-xs font-medium uppercase text-slate-500">
              {status}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {formatNumber(counts[status])}
            </p>
          </div>
        ))}
      </div>

      <dl className="grid gap-px bg-slate-100 text-sm sm:grid-cols-3">
        <SummaryDetail
          label="Completed amount"
          value={formatAmount(totals.completedCompanyAmount, currency)}
        />
        <SummaryDetail
          label="Pending amount"
          value={formatAmount(totals.pendingCompanyAmount, currency)}
        />
        <SummaryDetail
          label="Completed today"
          value={formatAmount(totals.todayCompletedCompanyAmount, currency)}
        />
      </dl>
    </div>
  )
}

type SummaryDetailProps = {
  label: string
  value: string
}

function SummaryDetail({ label, value }: SummaryDetailProps) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  )
}

function RecentTransactions({ dashboard }: { dashboard: CompanyDashboard }) {
  const isPartner = dashboard.transactions.scope === 'mine'
  const transactions = dashboard.transactions.recent

  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Recent transactions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest 5 records from the dashboard snapshot.
          </p>
        </div>
        <Link
          className="shrink-0 text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-950 hover:decoration-slate-700"
          to="/app/transactions"
        >
          View all
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <h3 className="text-sm font-semibold text-slate-950">
            {isPartner
              ? 'You have not created any transactions with this company yet.'
              : 'No company transactions yet.'}
          </h3>
          {isPartner ? (
            <Link
              className="mt-4 inline-flex h-10 items-center rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              to="/app/transactions/new"
            >
              Create transaction
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <RecentTransactionItem
              isPartner={isPartner}
              key={transaction.id}
              transaction={transaction}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

type RecentTransactionItemProps = {
  isPartner: boolean
  transaction: DashboardTransaction
}

function RecentTransactionItem({
  isPartner,
  transaction,
}: RecentTransactionItemProps) {
  return (
    <li className="px-4 py-4 hover:bg-slate-50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700"
              to={`/app/transactions/${encodeURIComponent(
                transaction.transactionCode,
              )}`}
            >
              <TransactionCodeDisplay code={transaction.transactionCode} />
            </Link>
            <StatusBadge status={transaction.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {isPartner ? (
              <>
                Beneficiary: {transaction.beneficiaryName}
                {' - '}
                Company amount:{' '}
                {formatAmount(
                  transaction.companyAmount,
                  transaction.companyCurrency,
                )}
              </>
            ) : (
              <>
                {getPartnerDisplay(transaction) || 'Unknown partner'}
                {' - '}
                Beneficiary: {transaction.beneficiaryName}
              </>
            )}
          </p>
        </div>
        <div className="text-sm text-slate-600 lg:text-right">
          <p className="font-medium text-slate-950">
            {formatAmount(
              transaction.companyAmount,
              transaction.companyCurrency,
            )}
          </p>
          <p className="mt-1">{formatDate(transaction.createdAt)}</p>
        </div>
      </div>
    </li>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={[
        'inline-flex rounded px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200',
      ].join(' ')}
    >
      {status}
    </span>
  )
}

function ContextualActions({ dashboard }: { dashboard: CompanyDashboard }) {
  const isManager = dashboard.viewer.role === 'manager'
  const isPartner = dashboard.viewer.role === 'partner'

  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">
        Contextual actions
      </h2>
      <div className="mt-4 grid gap-2">
        {isPartner ? (
          <ActionLink to="/app/transactions/new">Create transaction</ActionLink>
        ) : (
          <ActionLink to="/app/transactions">Review transactions</ActionLink>
        )}
        {isManager ? (
          <>
            <ActionLink to="/app/company/exchange-rate">
              Manage exchange rate
            </ActionLink>
            <ActionLink to="/app/company/cash">Record company cash</ActionLink>
            <ActionLink to="/app/company/invitations">
              Manage invitations
            </ActionLink>
          </>
        ) : null}
      </div>
    </div>
  )
}

type ActionLinkProps = {
  children: ReactNode
  to: string
}

function ActionLink({ children, to }: ActionLinkProps) {
  return (
    <Link
      className="flex h-10 items-center rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      to={to}
    >
      {children}
    </Link>
  )
}

function TrialBalanceSummary({
  error,
  trialBalance,
}: {
  error: string | null
  trialBalance: Record<string, unknown> | null
}) {
  const rows = getTrialBalanceRows(trialBalance)

  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">
        Trial balance summary
      </h2>
      {error ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Trial balance is temporarily unavailable.
        </p>
      ) : null}
      {!trialBalance ? (
        <p className="mt-3 text-sm text-slate-600">
          No trial balance available.
        </p>
      ) : null}
      {trialBalance && rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No account balances were returned.
        </p>
      ) : null}
      {rows.length > 0 ? (
        <dl className="mt-4 divide-y divide-slate-100 text-sm">
          {rows.slice(0, 8).map((row) => (
            <div
              className="flex items-center justify-between gap-4 py-2"
              key={`${row.currency}-${row.accountCode}`}
            >
              <dt className="min-w-0 text-slate-600">
                <span className="font-medium text-slate-950">
                  {row.currency}
                </span>{' '}
                {row.accountCode}
              </dt>
              <dd className="shrink-0 font-medium text-slate-950">
                {row.balance}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {rows.length > 8 ? (
        <p className="mt-3 text-xs text-slate-500">
          Showing 8 of {rows.length} balances.
        </p>
      ) : null}
    </div>
  )
}

type TrialBalanceRow = {
  accountCode: string
  balance: string
  currency: string
}

function getTrialBalanceRows(
  trialBalance: Record<string, unknown> | null,
): TrialBalanceRow[] {
  if (!trialBalance) {
    return []
  }

  return Object.entries(trialBalance).flatMap(([currency, accounts]) => {
    if (!isRecord(accounts)) {
      return [
        {
          accountCode: 'Summary',
          balance: formatUnknownBalance(accounts),
          currency,
        },
      ]
    }

    return Object.entries(accounts).map(([accountCode, balance]) => ({
      accountCode,
      balance: formatUnknownBalance(balance),
      currency,
    }))
  })
}

function StateMessage({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
      <h1 className="text-sm font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function getPartnerDisplay(transaction: DashboardTransaction) {
  const name = transaction.partner?.name?.trim()
  const email = transaction.partner?.email?.trim()

  if (name && email) {
    return `${name} (${email})`
  }

  return name || email || null
}

function formatAmount(
  amount: number | null | undefined,
  currency: DashboardCurrency | null | undefined,
) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) {
    return 'Not available'
  }

  return `${formatNumber(amount)} ${currency}`
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '0'
  }

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

function formatUnknownBalance(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatNumber(value)
    : String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Check your connection and try again.'
}
