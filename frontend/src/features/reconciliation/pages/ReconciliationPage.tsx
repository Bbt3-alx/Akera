import { useMemo, useState } from 'react'

import {
  useReconciliationIssues,
  useResolveReconciliationIssue,
  useScanReconciliation,
} from '../hooks.ts'
import type {
  ReconciliationFilters,
  ReconciliationIssue,
  ReconciliationSeverity,
  ReconciliationStatus,
  ReconciliationWorkflowType,
} from '../types.ts'
import {
  formatReconciliationAmount,
  getIssueTypeLabel,
  getSeverityLabel,
  getStatusLabel,
  getWorkflowTypeLabel,
  validateResolutionNote,
} from '../viewModel.ts'

const workflowOptions: ReconciliationWorkflowType[] = [
  'transaction',
  'payment',
  'receipt',
  'company_cash',
  'account_operation',
  'correspondent_collection',
  'correspondent_delivery',
  'remote_agent_payout',
]

const severityOptions: ReconciliationSeverity[] = [
  'critical',
  'warning',
  'info',
]

const statusOptions: ReconciliationStatus[] = ['open', 'resolved']

export function ReconciliationPage() {
  const [filters, setFilters] = useState<ReconciliationFilters>({
    limit: 25,
    page: 1,
    status: 'open',
  })
  const [resolvingIssue, setResolvingIssue] =
    useState<ReconciliationIssue | null>(null)
  const issuesQuery = useReconciliationIssues(filters)
  const scanMutation = useScanReconciliation()
  const resolveMutation = useResolveReconciliationIssue()
  const issues = issuesQuery.data?.issues ?? []
  const summary = issuesQuery.data?.summary ?? {
    critical: 0,
    open: 0,
    resolved: 0,
  }
  const lastDetectedAt = useMemo(
    () =>
      issues
        .map((issue) => issue.detectedAt)
        .filter(Boolean)
        .sort()
        .at(-1),
    [issues],
  )

  function updateFilter(key: keyof ReconciliationFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
    }))
  }

  function runScan() {
    scanMutation.mutate({
      from: filters.from || undefined,
      to: filters.to || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Reconciliation
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Detect unmatched financial records and track manager resolutions.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Last scan:{' '}
            {scanMutation.data?.detectedAt
              ? formatDate(scanMutation.data.detectedAt)
              : lastDetectedAt
                ? formatDate(lastDetectedAt)
                : 'No scan yet'}
          </p>
        </div>
        <button
          className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={scanMutation.isPending}
          onClick={runScan}
          type="button"
        >
          {scanMutation.isPending ? 'Scanning...' : 'Run scan'}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Open issues" value={summary.open} />
        <MetricCard label="Critical" value={summary.critical} tone="critical" />
        <MetricCard label="Resolved" value={summary.resolved} tone="resolved" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <SelectFilter
            label="Status"
            onChange={(value) => updateFilter('status', value)}
            value={filters.status ?? ''}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter
            label="Severity"
            onChange={(value) => updateFilter('severity', value)}
            value={filters.severity ?? ''}
          >
            <option value="">All severities</option>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {getSeverityLabel(severity)}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter
            label="Workflow"
            onChange={(value) => updateFilter('workflowType', value)}
            value={filters.workflowType ?? ''}
          >
            <option value="">All workflows</option>
            {workflowOptions.map((workflow) => (
              <option key={workflow} value={workflow}>
                {getWorkflowTypeLabel(workflow)}
              </option>
            ))}
          </SelectFilter>
          <TextFilter
            label="From"
            onChange={(value) => updateFilter('from', value)}
            type="date"
            value={filters.from ?? ''}
          />
          <TextFilter
            label="Search"
            onChange={(value) => updateFilter('search', value)}
            placeholder="Reference code"
            value={filters.search ?? ''}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {issuesQuery.isLoading ? (
          <InlineState title="Loading reconciliation issues" />
        ) : issuesQuery.error ? (
          <InlineState title="Unable to load reconciliation issues" />
        ) : issues.length === 0 ? (
          <InlineState title="No reconciliation issues found for the current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Workflow</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Difference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Detected</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <IssueRow
                    issue={issue}
                    key={issue.id}
                    onResolve={setResolvingIssue}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resolvingIssue ? (
        <ResolvePanel
          issue={resolvingIssue}
          isSaving={resolveMutation.isPending}
          onCancel={() => setResolvingIssue(null)}
          onResolve={(note) =>
            resolveMutation.mutate(
              { issueId: resolvingIssue.id, note },
              { onSuccess: () => setResolvingIssue(null) },
            )
          }
        />
      ) : null}
    </div>
  )
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string
  tone?: 'critical' | 'resolved'
  value: number
}) {
  const color =
    tone === 'critical'
      ? 'text-red-700'
      : tone === 'resolved'
        ? 'text-emerald-700'
        : 'text-slate-950'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function IssueRow({
  issue,
  onResolve,
}: {
  issue: ReconciliationIssue
  onResolve: (issue: ReconciliationIssue) => void
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-medium">
        {getSeverityLabel(issue.severity)}
      </td>
      <td className="px-4 py-3">{getWorkflowTypeLabel(issue.workflowType)}</td>
      <td className="px-4 py-3">{getIssueTypeLabel(issue.issueType)}</td>
      <td className="px-4 py-3">{issue.referenceCode ?? '-'}</td>
      <td className="px-4 py-3">
        {formatReconciliationAmount(issue.expectedAmount, issue.currency)}
      </td>
      <td className="px-4 py-3">
        {formatReconciliationAmount(issue.actualAmount, issue.currency)}
      </td>
      <td className="px-4 py-3">
        {formatReconciliationAmount(issue.difference, issue.currency)}
      </td>
      <td className="px-4 py-3">{getStatusLabel(issue.status)}</td>
      <td className="px-4 py-3">{formatDate(issue.detectedAt)}</td>
      <td className="px-4 py-3">
        {issue.status === 'open' ? (
          <button
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => onResolve(issue)}
            type="button"
          >
            Resolve
          </button>
        ) : (
          <span className="text-xs text-slate-500">Resolved</span>
        )}
      </td>
    </tr>
  )
}

function ResolvePanel({
  isSaving,
  issue,
  onCancel,
  onResolve,
}: {
  isSaving: boolean
  issue: ReconciliationIssue
  onCancel: () => void
  onResolve: (note: string) => void
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateResolutionNote(note)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onResolve(note.trim())
  }

  return (
    <form
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-semibold text-slate-950">
        Resolve {issue.referenceCode ?? issue.id}
      </h2>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Resolution note
        <textarea
          className="mt-1 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setNote(event.target.value)}
          value={note}
        />
      </label>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button
          className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          disabled={isSaving}
          type="submit"
        >
          Save resolution
        </button>
        <button
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function SelectFilter({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  )
}

function TextFilter({
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  value: string
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  )
}

function InlineState({ title }: { title: string }) {
  return <div className="p-6 text-sm text-slate-600">{title}</div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
