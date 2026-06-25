import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useMe } from '../../auth/hooks.ts'
import type { Membership } from '../../auth/types.ts'
import {
  getEnabledModulesForMembership,
  hasAnyGoldModule,
  hasAnyTransferModule,
  hasCompanyModule,
} from '../../companies/companyModules.ts'
import type { CompanyModule, CompanyTransferWorkflow } from '../../companies/types.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import {
  useMyRemoteAgentGroups,
  useRemoteAgentGroups,
  useRemoteAgentOperations,
} from '../../remoteAgentPayout/hooks.ts'
import type {
  RemoteAgentGroup,
  RemoteAgentOperation,
} from '../../remoteAgentPayout/types.ts'
import {
  buildRemoteAgentDashboardModel,
  formatPermissionLabel,
  getRemoteAgentDashboardQuickActions,
  getRemoteAgentPayoutErrorMessage,
} from '../../remoteAgentPayout/viewModel.ts'
import { useTransactionPinStatus } from '../../security/hooks.ts'
import { TransactionCodeDisplay } from '../../transactions/components/TransactionCodeDisplay.tsx'
import { getDashboardErrorMessage } from '../errorMessage.ts'
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
const REMOTE_DASHBOARD_LIST_PARAMS = { page: 1, limit: 50 } as const
const EMPTY_REMOTE_AGENT_GROUPS: RemoteAgentGroup[] = []
const EMPTY_REMOTE_AGENT_OPERATIONS: RemoteAgentOperation[] = []

export function DashboardPage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const { data } = useMe()
  const activeMembership = data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const enabledModules = getEnabledModulesForMembership(activeMembership)
  const transferWorkflows =
    activeMembership?.company?.transferWorkflows ??
    activeMembership?.companyTransferWorkflows ??
    []
  const hasTransfer = hasAnyTransferModule(enabledModules)
  const hasGold = hasAnyGoldModule(enabledModules)
  const hasRemoteAgentPayout = hasCompanyModule(
    enabledModules,
    'remote_agent_payout',
  )
  const isRemoteAgentPrimary =
    hasRemoteAgentPayout &&
    !hasLegacyTransferWorkflow(enabledModules, transferWorkflows)

  if (!activeCompanyId) {
    return (
      <StateMessage title="No company selected">
        Select a company to view dashboard metrics.
      </StateMessage>
    )
  }

  if (hasGold && !hasTransfer) {
    return <GoldDashboard />
  }

  if (hasGold && hasTransfer) {
    return <MixedDashboard />
  }

  if (isRemoteAgentPrimary && activeMembership) {
    return <RemoteAgentDashboard activeMembership={activeMembership} />
  }

  return <TransferDashboard />
}

function TransferDashboard() {
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
        {getDashboardErrorMessage(dashboardQuery.error)}
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
        <div className="min-w-0">
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
              className="inline-flex h-10 items-center justify-center rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              to="/app/transactions/new"
            >
              New transaction
            </Link>
          ) : (
            <Link
              className="inline-flex h-10 items-center justify-center rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
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

function RemoteAgentDashboard({
  activeMembership,
}: {
  activeMembership: Membership
}) {
  const isManager = activeMembership.role === 'manager'
  const isEmployee = activeMembership.role === 'employee'
  const transactionPinStatusQuery = useTransactionPinStatus(
    Boolean(isManager || isEmployee),
  )
  const managerGroupsQuery = useRemoteAgentGroups(
    REMOTE_DASHBOARD_LIST_PARAMS,
    isManager,
  )
  const myGroupsQuery = useMyRemoteAgentGroups(isEmployee)
  const operationsQuery = useRemoteAgentOperations(
    REMOTE_DASHBOARD_LIST_PARAMS,
    Boolean(isManager || isEmployee),
  )
  const groups = isManager
    ? managerGroupsQuery.data?.data ?? EMPTY_REMOTE_AGENT_GROUPS
    : myGroupsQuery.data?.data ?? EMPTY_REMOTE_AGENT_GROUPS
  const operations =
    operationsQuery.data?.data ?? EMPTY_REMOTE_AGENT_OPERATIONS
  const model = useMemo(
    () =>
      buildRemoteAgentDashboardModel({
        activeMembershipId: activeMembership.membershipId,
        groups,
        operations,
        role: activeMembership.role,
        transactionPinConfigured:
          transactionPinStatusQuery.data?.configured ?? false,
      }),
    [
      activeMembership.membershipId,
      activeMembership.role,
      groups,
      operations,
      transactionPinStatusQuery.data?.configured,
    ],
  )
  const isLoading =
    operationsQuery.isLoading ||
    (isManager && managerGroupsQuery.isLoading) ||
    (isEmployee && myGroupsQuery.isLoading) ||
    transactionPinStatusQuery.isLoading
  const error =
    operationsQuery.error ??
    (isManager ? managerGroupsQuery.error : myGroupsQuery.error) ??
    transactionPinStatusQuery.error

  if (!isManager && !isEmployee) {
    return (
      <StateMessage title="Remote agent dashboard unavailable">
        This dashboard is reserved for managers and authorized employees.
      </StateMessage>
    )
  }

  if (isLoading) {
    return (
      <StateMessage title="Chargement du dashboard agents">
        Calcul des caisses, permissions et opérations récentes.
      </StateMessage>
    )
  }

  if (error) {
    return (
      <StateMessage title="Dashboard agents indisponible">
        {getDashboardErrorMessage(
          error,
          getRemoteAgentPayoutErrorMessage(error),
        )}
      </StateMessage>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-slate-500">
            {activeMembership.role}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Dashboard paiements agents
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Suivez les caisses de groupes, les dépôts et les paiements agents
            autorisés pour cette société.
          </p>
        </div>
        <button
          className="h-10 rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            operationsQuery.isFetching ||
            managerGroupsQuery.isFetching ||
            myGroupsQuery.isFetching
          }
          onClick={() => {
            void operationsQuery.refetch()
            if (isManager) {
              void managerGroupsQuery.refetch()
            }
            if (isEmployee) {
              void myGroupsQuery.refetch()
            }
          }}
          type="button"
        >
          {operationsQuery.isFetching ? 'Actualisation' : 'Actualiser'}
        </button>
      </div>

      {isManager ? (
        <RemoteManagerDashboard
          groups={model.activeGroups}
          model={model}
        />
      ) : (
        <RemoteAgentEmployeeDashboard
          activeMembershipId={activeMembership.membershipId}
          groups={model.activeGroups}
          model={model}
        />
      )}
    </section>
  )
}

function RemoteManagerDashboard({
  groups,
  model,
}: {
  groups: RemoteAgentGroup[]
  model: ReturnType<typeof buildRemoteAgentDashboardModel>
}) {
  const metrics = model.managerMetrics

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <MetricCard
          label="Solde total des caisses"
          value={formatAmount(metrics.totalBalance, 'FCFA')}
        />
        <MetricCard
          label="Solde réservé"
          value={formatAmount(metrics.totalReservedBalance, 'FCFA')}
        />
        <MetricCard
          label="Solde disponible"
          value={formatAmount(metrics.totalAvailableBalance, 'FCFA')}
        />
        <MetricCard
          label="Paiements en attente"
          value={formatNumber(metrics.pendingPayoutCount)}
        />
        <MetricCard
          label="Paiements payés aujourd’hui"
          value={formatAmount(metrics.paidTodayAmount, 'FCFA')}
        />
        <MetricCard
          label="Dépôts du jour"
          value={formatAmount(metrics.depositsTodayAmount, 'FCFA')}
        />
        <MetricCard
          label="Groupes actifs"
          value={formatNumber(metrics.activeGroupCount)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <RemoteGroupCashPanel groups={groups} title="Groupes actifs" />
          <RemoteRecentOperations operations={model.recentOperations} />
        </div>
        <RemoteQuickActions
          actions={getRemoteAgentDashboardQuickActions({
            permissions: [],
            role: 'manager',
          })}
        />
      </div>
    </>
  )
}

function RemoteAgentEmployeeDashboard({
  activeMembershipId,
  groups,
  model,
}: {
  activeMembershipId: string
  groups: RemoteAgentGroup[]
  model: ReturnType<typeof buildRemoteAgentDashboardModel>
}) {
  const metrics = model.agentMetrics

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="PIN de transaction"
          value={metrics.transactionPinConfigured ? 'Configuré' : 'À configurer'}
        />
        <MetricCard
          label="Mes groupes actifs"
          value={formatNumber(metrics.activeGroupCount)}
        />
        <MetricCard
          label="Mes permissions"
          value={
            metrics.permissionLabels.length > 0
              ? metrics.permissionLabels.join(', ')
              : 'Aucune'
          }
        />
        <MetricCard
          label="Montant déposé aujourd’hui par moi"
          value={formatAmount(metrics.myDepositsTodayAmount, 'FCFA')}
        />
        <MetricCard
          label="Montant payé aujourd’hui par moi"
          value={formatAmount(metrics.myPaidTodayAmount, 'FCFA')}
        />
        <MetricCard
          label="Paiements effectués aujourd’hui"
          value={formatNumber(metrics.myPaidTodayCount)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <RemoteAgentGroupsPanel
            activeMembershipId={activeMembershipId}
            groups={groups}
          />
          <RemoteRecentOperations operations={model.recentOperations} />
        </div>
        <RemoteQuickActions
          actions={getRemoteAgentDashboardQuickActions({
            permissions: model.agentMetrics.permissions,
            role: 'employee',
          })}
        />
      </div>
    </>
  )
}

function RemoteGroupCashPanel({
  groups,
  title,
}: {
  groups: RemoteAgentGroup[]
  title: string
}) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      {groups.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-600">
          Aucun groupe actif pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Groupe</th>
                <th className="px-4 py-3">Caisse</th>
                <th className="px-4 py-3">Réservé</th>
                <th className="px-4 py-3">Disponible</th>
                <th className="px-4 py-3">Membres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((group) => (
                <tr className="hover:bg-slate-50" key={group.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                    {group.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatAmount(group.balance, group.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatAmount(group.reservedBalance, group.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatAmount(group.availableBalance, group.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatNumber(group.members.length)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RemoteAgentGroupsPanel({
  activeMembershipId,
  groups,
}: {
  activeMembershipId: string
  groups: RemoteAgentGroup[]
}) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">Mes groupes</h2>
      </div>
      {groups.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-600">
          Aucun groupe actif autorisé pour le moment.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {groups.map((group) => (
            <li className="px-4 py-4" key={group.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-medium text-slate-950">{group.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatAmount(group.availableBalance, group.currency)} disponible
                  </p>
                </div>
                <div className="text-sm text-slate-600 lg:text-right">
                  <p className="font-medium text-slate-950">
                    {getRemoteAgentGroupRoleLabel(group, activeMembershipId)}
                  </p>
                  <p className="mt-1">
                    {getRemoteAgentGroupPermissionLabels(
                      group,
                      activeMembershipId,
                    )}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RemoteRecentOperations({
  operations,
}: {
  operations: ReturnType<typeof buildRemoteAgentDashboardModel>['recentOperations']
}) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Opérations récentes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Dernières opérations autorisées.
          </p>
        </div>
        <Link
          className="shrink-0 text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-950 hover:decoration-slate-700"
          to="/app/operations"
        >
          Voir tout
        </Link>
      </div>
      {operations.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-600">
          Aucune opération pour le moment.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {operations.map((operation, index) => (
            <li className="px-4 py-4" key={`${operation.referenceLabel}-${index}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-950">
                      {operation.referenceLabel}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {operation.typeLabel}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-600">
                    {operation.groupLabel} - {operation.actorLabel}
                    {operation.beneficiaryLabel !== 'Non applicable'
                      ? ` - ${operation.beneficiaryLabel}`
                      : ''}
                  </p>
                </div>
                <div className="shrink-0 text-sm text-slate-600 lg:text-right">
                  <p className="font-medium text-slate-950">
                    {operation.amountLabel}
                  </p>
                  <p className="mt-1">
                    {operation.statusLabel} - {operation.dateLabel}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RemoteQuickActions({
  actions,
}: {
  actions: Array<{ label: string; to: string }>
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">Actions rapides</h2>
      <div className="mt-4 grid gap-2">
        {actions.map((action) => (
          <ActionLink key={action.to + action.label} to={action.to}>
            {action.label}
          </ActionLink>
        ))}
      </div>
    </div>
  )
}

function GoldDashboard() {
  return (
    <StateMessage title="Gold trading dashboard coming next">
      Gold trading analytics will be added after the gold workflow pages are
      wired into the new module shell.
    </StateMessage>
  )
}

function MixedDashboard() {
  return (
    <section className="space-y-6">
      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Mixed company</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Company dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Review transfer operations now, with gold trading analytics grouped
          below as the next module area.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardModuleCard
          description="Existing transfer and correspondent collection metrics."
          title="Transfers"
          to="/app/dashboard"
        />
        <DashboardModuleCard
          description="Gold trading dashboard coming next"
          title="Gold Trading"
          to="/app/gold/dashboard"
        />
      </div>

      <TransferDashboard />
    </section>
  )
}

function DashboardModuleCard({
  description,
  title,
  to,
}: {
  description: string
  title: string
  to: string
}) {
  return (
    <Link
      className="block rounded border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      to={to}
    >
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </Link>
  )
}

function MetricGrid({ dashboard }: { dashboard: CompanyDashboard }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {dashboard.cash.visible ? (
        <MetricCard
          label="Company cash"
          value={formatAmount(dashboard.cash.balance, dashboard.cash.currency)}
        />
      ) : null}
      {dashboard.partnerBalance?.visible ? (
        <MetricCard
          label="Your balance with this company"
          value={formatAmount(
            dashboard.partnerBalance.balance,
            dashboard.partnerBalance.currency,
          )}
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
        <p className="break-words text-sm font-medium text-slate-500">
          {label}
        </p>
        {action}
      </div>
      <p className="mt-2 break-words text-lg font-semibold text-slate-950 sm:text-xl">
        {value}
      </p>
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

      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
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
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
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
          <p className="mt-2 break-words text-sm text-slate-600">
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
        <div className="shrink-0 text-sm text-slate-600 lg:text-right">
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
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              key={`${row.currency}-${row.accountCode}`}
            >
              <dt className="min-w-0 text-slate-600">
                <span className="font-medium text-slate-950">
                  {row.currency}
                </span>{' '}
                {row.accountCode}
              </dt>
              <dd className="break-words font-medium text-slate-950 sm:shrink-0">
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

function hasLegacyTransferWorkflow(
  enabledModules: readonly CompanyModule[],
  transferWorkflows: readonly CompanyTransferWorkflow[],
) {
  if (transferWorkflows.length > 0) {
    return transferWorkflows.includes('correspondent_collection')
  }

  return (
    hasCompanyModule(enabledModules, 'correspondent_collections') ||
    (hasCompanyModule(enabledModules, 'transfers') &&
      !hasCompanyModule(enabledModules, 'remote_agent_payout'))
  )
}

function getRemoteAgentGroupRoleLabel(
  group: RemoteAgentGroup,
  activeMembershipId: string,
) {
  const role =
    group.currentMemberRole ??
    group.members.find((member) => member.membership === activeMembershipId)
      ?.role
  const labels: Record<string, string> = {
    agent: 'Agent',
    supervisor: 'Superviseur',
  }

  return role ? labels[role] ?? role : 'Membre'
}

function getRemoteAgentGroupPermissionLabels(
  group: RemoteAgentGroup,
  activeMembershipId: string,
) {
  const permissions =
    group.currentMemberPermissions ??
    group.members.find((member) => member.membership === activeMembershipId)
      ?.permissions ??
    []

  return permissions.length > 0
    ? permissions.map(formatPermissionLabel).join(', ')
    : 'Aucune permission'
}
