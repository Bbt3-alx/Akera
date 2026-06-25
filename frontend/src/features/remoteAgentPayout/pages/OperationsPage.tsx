import { useMemo, useState, type ReactNode } from 'react'

import { useRemoteAgentOperations } from '../hooks.ts'
import type { RemoteAgentOperationType } from '../types.ts'
import {
  buildRemoteAgentOperationDisplayRow,
  getRemoteAgentOperationStatusLabel,
  getRemoteAgentOperationTypeLabel,
  getRemoteAgentPayoutErrorMessage,
  REMOTE_AGENT_OPERATION_COLUMNS,
} from '../viewModel.ts'

const OPERATION_TYPES = [
  'remote_agent_deposit',
  'remote_payout_created',
  'remote_payout_paid',
  'remote_payout_canceled',
] as const satisfies readonly RemoteAgentOperationType[]
const OPERATION_STATUSES = ['completed', 'pending', 'paid', 'canceled'] as const

export function OperationsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<RemoteAgentOperationType | ''>('')
  const [status, setStatus] = useState('')
  const params = useMemo(
    () => ({
      limit: 50,
      page,
      search,
      status,
      type: type || undefined,
    }),
    [page, search, status, type],
  )
  const operationsQuery = useRemoteAgentOperations(params)
  const operations = operationsQuery.data?.data ?? []
  const pagination = operationsQuery.data?.pagination
  const totalPages = pagination?.pages ?? 1

  function resetToFirstPage() {
    setPage(1)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Opérations</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Consultez les dépôts et paiements liés aux groupes agents autorisés.
          </p>
        </div>
        <button
          className="h-10 rounded border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={operationsQuery.isFetching}
          onClick={() => void operationsQuery.refetch()}
          type="button"
        >
          {operationsQuery.isFetching ? 'Actualisation' : 'Actualiser'}
        </button>
      </div>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(220px,1fr)_220px_220px]">
          <label className="text-sm font-medium text-slate-700">
            Recherche
            <input
              className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              onChange={(event) => {
                setSearch(event.target.value)
                resetToFirstPage()
              }}
              placeholder="Référence, groupe, acteur, bénéficiaire"
              type="search"
              value={search}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Type
            <select
              className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              onChange={(event) => {
                setType(event.target.value as RemoteAgentOperationType | '')
                resetToFirstPage()
              }}
              value={type}
            >
              <option value="">Tous les types</option>
              {OPERATION_TYPES.map((operationType) => (
                <option key={operationType} value={operationType}>
                  {getRemoteAgentOperationTypeLabel(operationType)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Statut
            <select
              className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              onChange={(event) => {
                setStatus(event.target.value)
                resetToFirstPage()
              }}
              value={status}
            >
              <option value="">Tous les statuts</option>
              {OPERATION_STATUSES.map((operationStatus) => (
                <option key={operationStatus} value={operationStatus}>
                  {getRemoteAgentOperationStatusLabel(operationStatus)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {operationsQuery.isLoading ? (
          <InlineState title="Chargement">
            Chargement des opérations autorisées.
          </InlineState>
        ) : null}

        {operationsQuery.isError ? (
          <InlineState title="Chargement impossible">
            {getErrorMessage(operationsQuery.error)}
          </InlineState>
        ) : null}

        {!operationsQuery.isLoading &&
        !operationsQuery.isError &&
        operations.length === 0 ? (
          <InlineState title="Aucune opération pour le moment.">
            Aucune opération pour le moment.
          </InlineState>
        ) : null}

        {!operationsQuery.isLoading &&
        !operationsQuery.isError &&
        operations.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    {REMOTE_AGENT_OPERATION_COLUMNS.map((column) => (
                      <th className="px-4 py-3" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operations.map((operation) => {
                    const row = buildRemoteAgentOperationDisplayRow(operation)

                    return (
                      <tr className="hover:bg-slate-50" key={operation.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {row.dateLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                          {row.typeLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.referenceLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.groupLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.actorLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.beneficiaryLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                          {row.amountLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge status={operation.status}>
                            {row.statusLabel}
                          </StatusBadge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {pagination?.page ?? page}
                {pagination?.total ? ` sur ${totalPages}` : ''}
              </span>
              <div className="flex gap-2">
                <button
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page <= 1 || operationsQuery.isFetching}
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                  type="button"
                >
                  Précédent
                </button>
                <button
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page >= totalPages || operationsQuery.isFetching}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  type="button"
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </section>
  )
}

function InlineState({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function StatusBadge({
  children,
  status,
}: {
  children: ReactNode
  status: string
}) {
  const styles: Record<string, string> = {
    canceled: 'bg-rose-50 text-rose-700 ring-rose-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  }

  return (
    <span
      className={[
        'inline-flex rounded px-2 py-1 text-xs font-medium ring-1 ring-inset',
        styles[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200',
      ].join(' ')}
    >
      {children}
    </span>
  )
}

function getErrorMessage(error: unknown) {
  return getRemoteAgentPayoutErrorMessage(error)
}
