import type { AuditTimelineEvent, AuditTimelineFilters } from './types.ts'

export const AUDIT_ACTION_OPTIONS = [
  'TRANSACTION_CREATE',
  'TRANSACTION_PAY',
  'TRANSACTION_CANCEL',
  'TRANSACTION_REVERSE',
  'COMPANY_CASH_DEPOSIT',
  'ACCOUNT_OPERATION_WITHDRAWAL_REQUEST',
  'ACCOUNT_OPERATION_CONFIRM',
  'ACCOUNT_OPERATION_REJECT',
  'CORRESPONDENT_COLLECTION_CREATE',
  'CORRESPONDENT_COLLECTION_PAY',
  'CORRESPONDENT_COLLECTION_CONFIRM',
  'CORRESPONDENT_COLLECTION_CANCEL',
  'CORRESPONDENT_DELIVERY_CREATE',
  'CORRESPONDENT_DELIVERY_CONFIRM',
  'CORRESPONDENT_DELIVERY_CANCEL',
  'REMOTE_AGENT_PAYOUT_CREATE',
  'REMOTE_AGENT_PAYOUT_PAY',
  'REMOTE_AGENT_PAYOUT_CANCEL',
  'REMOTE_AGENT_GROUP_CREATE',
  'REMOTE_AGENT_GROUP_UPDATE',
  'REMOTE_AGENT_GROUP_MEMBER_ADD',
  'REMOTE_AGENT_GROUP_MEMBER_UPDATE',
  'SECURITY_TRANSACTION_PIN_SETUP',
  'SECURITY_TRANSACTION_PIN_CHANGE',
  'RECONCILIATION_SCAN',
  'RECONCILIATION_ISSUE_RESOLVE',
] as const

export const AUDIT_COLLECTION_OPTIONS = [
  'Transaction',
  'CompanyCashMovement',
  'AccountOperation',
  'CorrespondentCollection',
  'CorrespondentDelivery',
  'RemoteAgentPayout',
  'RemoteAgentGroup',
  'ReconciliationIssue',
  'User',
] as const

const CHIP_KEYS = [
  'status',
  'amount',
  'companyAmount',
  'inputAmount',
  'reason',
  'receiptNumber',
] as const

const AMOUNT_CURRENCY_PAIRS: Array<[amountKey: string, currencyKey: string]> = [
  ['amount', 'currency'],
  ['companyAmount', 'companyCurrency'],
  ['inputAmount', 'inputCurrency'],
  ['expectedAmount', 'currency'],
  ['actualAmount', 'currency'],
  ['difference', 'currency'],
]

const INTERNAL_REFERENCE_KEYS = new Set([
  'accountoperation',
  'correspondentmembership',
  'paidby',
  'paidbymembership',
])

export function normalizeAuditTimelineFilters(
  filters: AuditTimelineFilters,
): AuditTimelineFilters {
  const normalized: AuditTimelineFilters = {}

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        normalized[key as keyof AuditTimelineFilters] = trimmed as never
      }
      continue
    }

    if (typeof value === 'number') {
      normalized[key as keyof AuditTimelineFilters] = value as never
    }
  }

  return normalized
}

export function getAuditActionLabel(action: string): string {
  return sentenceCase(action)
}

export function getTimelineReference(log: AuditTimelineEvent): string {
  return log.targetCode || log.targetId || 'No reference'
}

export function formatTimelineDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getActorDisplayName(log: AuditTimelineEvent): string {
  return log.actor.name || log.actor.email || 'Unknown actor'
}

export function getDetailEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  const record = value as Record<string, unknown>

  return Object.entries(record).flatMap(([key, nestedValue]) => {
    if (
      isPairedCurrencyKey(key, record) ||
      shouldOmitDetailEntry(key, nestedValue)
    ) {
      return []
    }

    return [[sentenceCase(key), formatDetailValue(key, nestedValue, record)]]
  })
}

export function getMetadataChips(log: AuditTimelineEvent): string[] {
  if (!log.details || typeof log.details !== 'object' || Array.isArray(log.details)) {
    return []
  }

  const details = log.details as Record<string, unknown>

  return CHIP_KEYS.flatMap((key) => {
    const value = details[key]

    if (value === undefined || value === null || value === '') {
      return []
    }

    return [`${sentenceCase(key)}: ${formatDetailValue(key, value, details)}`]
  }).slice(0, 4)
}

export function getCategoryLabel(category: string): string {
  return sentenceCase(category)
}

export function stringifyDetailValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return JSON.stringify(value)
}

function formatDetailValue(
  key: string,
  value: unknown,
  record?: Record<string, unknown>,
): string {
  const currencyKey = getCurrencyKeyForAmount(key)

  if (currencyKey) {
    return formatAmount(value, record?.[currencyKey])
  }

  if (isStatusKey(key) && typeof value === 'string') {
    return sentenceCase(value)
  }

  return stringifyReadableValue(value)
}

function stringifyReadableValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return formatNumber(value)
  }

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyReadableValue(item)).join(', ')
  }

  const record = value as Record<string, unknown>
  const objectIdHex = getSerializedObjectIdHex(record)

  if (objectIdHex) {
    return objectIdHex
  }

  if (Object.keys(record).length === 0) {
    return '-'
  }

  if (isChangeRecord(record)) {
    return `${stringifyChangeEndpoint(record.from)} -> ${stringifyChangeEndpoint(
      record.to,
    )}`
  }

  const entries = Object.entries(record).flatMap(([key, nestedValue]) => {
    if (isPairedCurrencyKey(key, record)) {
      return []
    }

    return `${sentenceCase(key)}: ${formatDetailValue(key, nestedValue, record)}`
  })

  return entries.length > 0 ? entries.join(', ') : JSON.stringify(value)
}

function shouldOmitDetailEntry(key: string, value: unknown): boolean {
  if (isEmptyDetailValue(value)) {
    return true
  }

  return isInternalReferenceKey(key) && isObjectIdReferenceValue(value)
}

function isEmptyDetailValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length === 0)
  )
}

function isInternalReferenceKey(key: string): boolean {
  return INTERNAL_REFERENCE_KEYS.has(key.toLowerCase())
}

function isObjectIdReferenceValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return /^[a-f0-9]{24}$/i.test(value)
  }

  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Boolean(getSerializedObjectIdHex(value as Record<string, unknown>))
  )
}

function stringifyChangeEndpoint(value: unknown): string {
  if (typeof value === 'string') {
    return sentenceCase(value)
  }

  return stringifyReadableValue(value)
}

function formatAmount(value: unknown, currency: unknown): string {
  const formattedValue =
    typeof value === 'number' ? formatNumber(value) : stringifyReadableValue(value)
  const formattedCurrency =
    typeof currency === 'string' && currency.trim() ? ` ${currency.trim()}` : ''

  return `${formattedValue}${formattedCurrency}`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function getSerializedObjectIdHex(value: Record<string, unknown>): string | null {
  const bufferValue =
    value.buffer ?? (value.type === 'Buffer' ? value.data : null)
  const bytes = getIndexedBytes(bufferValue)

  if (!bytes || bytes.length !== 12) {
    return null
  }

  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function getIndexedBytes(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    return value.every(isByte) ? value : null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const entries = Object.entries(value).sort(
    ([left], [right]) => Number(left) - Number(right),
  )

  if (
    entries.length === 0 ||
    !entries.every(
      ([key, byte], index) => Number(key) === index && isByte(byte),
    )
  ) {
    return null
  }

  return entries.map(([, byte]) => byte as number)
}

function isByte(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 255
}

function getCurrencyKeyForAmount(key: string): string | null {
  return (
    AMOUNT_CURRENCY_PAIRS.find(([amountKey]) => amountKey === key)?.[1] ?? null
  )
}

function isPairedCurrencyKey(
  key: string,
  record: Record<string, unknown>,
): boolean {
  return AMOUNT_CURRENCY_PAIRS.some(
    ([amountKey, currencyKey]) =>
      currencyKey === key &&
      record[amountKey] !== undefined &&
      record[amountKey] !== null &&
      record[amountKey] !== '',
  )
}

function isChangeRecord(
  value: Record<string, unknown>,
): value is { from: unknown; to: unknown } {
  return Object.prototype.hasOwnProperty.call(value, 'from') ||
    Object.prototype.hasOwnProperty.call(value, 'to')
}

function isStatusKey(key: string): boolean {
  return key.toLowerCase().includes('status')
}

function sentenceCase(value: string): string {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()

  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
