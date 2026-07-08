import { useMemo, useState, type ReactNode } from 'react'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useAuditTimeline } from '../hooks.ts'
import type { AuditTimelineEvent, AuditTimelineFilters } from '../types.ts'
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_COLLECTION_OPTIONS,
  formatTimelineDate,
  getActorDisplayName,
  getAuditActionLabel,
  getCategoryLabel,
  getDetailEntries,
  getMetadataChips,
  getTimelineReference,
} from '../viewModel.ts'

export function AuditTimelinePage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const activeMembership = meQuery.data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const isManager = activeMembership?.role === 'manager'
  const [filters, setFilters] = useState<AuditTimelineFilters>({
    limit: 25,
    page: 1,
  })
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const timelineQuery = useAuditTimeline(filters)
  const logs = timelineQuery.data?.logs ?? []
  const selectedLog = useMemo(
    () => logs.find((log) => log.id === selectedLogId) ?? logs[0] ?? null,
    [logs, selectedLogId],
  )
  const summary = timelineQuery.data?.summary ?? {
    security: 0,
    today: 0,
    total: 0,
  }

  function updateFilter(key: keyof AuditTimelineFilters, value: string) {
    setSelectedLogId(null)
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
    }))
  }

  if (meQuery.isLoading) {
    return <InlineState title="Checking audit access" />
  }

  if (!activeCompanyId) {
    return <InlineState title="Select a company to view audit activity." />
  }

  if (!isManager) {
    return (
      <InlineState title="Audit timeline unavailable for this membership." />
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Audit timeline
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Review manager-visible business audit events for the active company.
          </p>
        </div>
        <button
          className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={timelineQuery.isFetching}
          onClick={() => void timelineQuery.refetch()}
          type="button"
        >
          {timelineQuery.isFetching ? 'Refreshing' : 'Refresh'}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visible events" value={summary.total} />
        <MetricCard label="Today" value={summary.today} />
        <MetricCard label="Security events" value={summary.security} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <SelectFilter
            label="Action"
            onChange={(value) => updateFilter('action', value)}
            value={filters.action ?? ''}
          >
            <option value="">All actions</option>
            {AUDIT_ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {getAuditActionLabel(action)}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter
            label="Workflow"
            onChange={(value) => updateFilter('collectionName', value)}
            value={filters.collectionName ?? ''}
          >
            <option value="">All workflows</option>
            {AUDIT_COLLECTION_OPTIONS.map((collectionName) => (
              <option key={collectionName} value={collectionName}>
                {collectionName}
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
            label="To"
            onChange={(value) => updateFilter('to', value)}
            type="date"
            value={filters.to ?? ''}
          />
          <TextFilter
            label="Search"
            onChange={(value) => updateFilter('search', value)}
            placeholder="Reference code"
            value={filters.search ?? ''}
          />
        </div>
      </section>

      {timelineQuery.isLoading ? (
        <InlineState title="Loading audit activity" />
      ) : timelineQuery.error ? (
        <InlineState title="Unable to load audit activity" />
      ) : logs.length === 0 ? (
        <InlineState title="No audit events found for the current filters." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-3">
            {logs.map((log) => (
              <TimelineEventCard
                isSelected={selectedLog?.id === log.id}
                key={log.id}
                log={log}
                onSelect={() => setSelectedLogId(log.id)}
              />
            ))}
          </section>
          <AuditDetailPanel log={selectedLog} />
        </div>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function TimelineEventCard({
  isSelected,
  log,
  onSelect,
}: {
  isSelected: boolean
  log: AuditTimelineEvent
  onSelect: () => void
}) {
  const chips = getMetadataChips(log)

  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm transition ${
        isSelected ? 'border-slate-950 ring-1 ring-slate-950' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {formatTimelineDate(log.occurredAt)}
          </div>
          <h2 className="mt-2 text-base font-semibold text-slate-950">
            {log.actionLabel}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {getActorDisplayName(log)}
            {log.actor.email && log.actor.name ? ` - ${log.actor.email}` : ''}
          </p>
        </div>
        <button
          className="rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={onSelect}
          type="button"
        >
          View details
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
          {getTimelineReference(log)}
        </span>
        <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
          {getCategoryLabel(log.category)}
        </span>
        {chips.map((chip) => (
          <span
            className="rounded border border-slate-200 px-2 py-1 text-slate-600"
            key={chip}
          >
            {chip}
          </span>
        ))}
      </div>
    </article>
  )
}

function AuditDetailPanel({ log }: { log: AuditTimelineEvent | null }) {
  if (!log) {
    return <InlineState title="Select an audit event to inspect details." />
  }

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-6 xl:self-start">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Event details
      </div>
      <h2 className="mt-2 text-lg font-semibold text-slate-950">
        {log.actionLabel}
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        <DetailRow label="Reference" value={getTimelineReference(log)} />
        <DetailRow label="Workflow" value={log.collectionName} />
        <DetailRow label="Category" value={getCategoryLabel(log.category)} />
        <DetailRow label="Actor" value={getActorDisplayName(log)} />
        <DetailRow label="Occurred" value={formatTimelineDate(log.occurredAt)} />
      </dl>
      <DetailSection title="Metadata" value={log.details} />
      <DetailSection title="Changes" value={log.changes} />
    </aside>
  )
}

function DetailSection({ title, value }: { title: string; value: unknown }) {
  const entries = getDetailEntries(value)

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      {entries.length > 0 ? (
        <dl className="mt-3 space-y-2 text-sm">
          {entries.map(([label, entryValue]) => (
            <DetailRow key={label} label={label} value={entryValue} />
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No {title.toLowerCase()}.</p>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-slate-900">{value}</dd>
    </div>
  )
}

function SelectFilter({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode
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
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      {title}
    </div>
  )
}
