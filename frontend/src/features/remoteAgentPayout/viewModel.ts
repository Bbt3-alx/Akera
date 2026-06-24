import type { AuthRole } from '../auth/types.ts'
import type {
  RemoteEligibleAgent,
  RemoteAgentGroup,
  RemoteAgentGroupMember,
  RemoteAgentGroupMemberPayload,
  RemoteAgentGroupMemberRole,
  RemoteAgentOperation,
  RemoteAgentOperationType,
  RemoteAgentPayout,
  RemotePayoutPermission,
} from './types.ts'

export type RemoteAgentManagerSection =
  | 'overview'
  | 'groups'
  | 'create-payout'
  | 'payouts'

export type RemoteAgentEmployeeSection =
  | 'my-groups'
  | 'record-deposit'
  | 'pay-beneficiary'
  | 'history'

export type RemoteAgentModuleSection =
  | RemoteAgentManagerSection
  | RemoteAgentEmployeeSection

export type RemoteAgentGroupRow = {
  id: string
  name: string
  balance: number
  reservedBalance: number
  availableBalance: number
  currency: 'FCFA'
  status: RemoteAgentGroup['status']
  memberCount: number
}

export type RemoteAgentOverview = {
  totalBalance: number
  totalReservedBalance: number
  totalAvailableBalance: number
  activeGroupCount: number
  pendingPayoutCount: number
  paidPayoutCount: number
  canceledPayoutCount: number
  hasData: boolean
}

export type RemoteAgentModuleModel = {
  activeAgentGroups: RemoteAgentGroup[]
  groupRows: RemoteAgentGroupRow[]
  overview: RemoteAgentOverview
  sections: RemoteAgentModuleSection[]
}

type BuildRemoteAgentModuleModelInput = {
  activeMembershipId?: string | null
  groups: RemoteAgentGroup[]
  payouts: RemoteAgentPayout[]
  role: AuthRole | undefined
}

type CreatePayoutResultInput = {
  payout: RemoteAgentPayout
  beneficiaryCode?: string
}

type CreatePayoutResult = {
  payoutCode: string
  beneficiaryCode: string
  warning: string
}

type BeneficiaryPaymentState = {
  beneficiaryCode: string
  lookupPayout: RemoteAgentPayout | null
  transactionPin: string
}

type AgentCapabilities = {
  canDeposit: boolean
  canPay: boolean
  payableGroups: RemoteAgentGroup[]
  depositGroups: RemoteAgentGroup[]
}

type BuildRemoteAgentMemberPayloadInput = {
  manualMembershipId: string
  permissions: RemotePayoutPermission[]
  role: RemoteAgentGroupMemberRole
  selectedAgent: RemoteEligibleAgent | null
  transactionPin: string
  useManualMembershipId: boolean
}

type EligibleAgentVisibleIdentity = {
  primary: string
  secondary: string | null
}

type RemoteAgentOperationDisplayRow = {
  actorLabel: string
  amountLabel: string
  beneficiaryLabel: string
  dateLabel: string
  groupLabel: string
  referenceLabel: string
  statusLabel: string
  typeLabel: string
}

type RemoteAgentManagerDashboardMetrics = {
  activeGroupCount: number
  depositsTodayAmount: number
  paidTodayAmount: number
  paidTodayCount: number
  pendingPayoutCount: number
  totalAvailableBalance: number
  totalBalance: number
  totalReservedBalance: number
}

type RemoteAgentDashboardAgentMetrics = {
  activeGroupCount: number
  myDepositsTodayAmount: number
  myPaidTodayAmount: number
  myPaidTodayCount: number
  permissionLabels: string[]
  permissions: RemotePayoutPermission[]
  transactionPinConfigured: boolean
}

type RemoteAgentDashboardModel = {
  activeGroups: RemoteAgentGroup[]
  agentMetrics: RemoteAgentDashboardAgentMetrics
  managerMetrics: RemoteAgentManagerDashboardMetrics
  recentOperations: RemoteAgentOperationDisplayRow[]
  role: AuthRole | undefined
}

type BuildRemoteAgentDashboardModelInput = {
  activeMembershipId?: string | null
  groups: RemoteAgentGroup[]
  now?: Date
  operations: RemoteAgentOperation[]
  role: AuthRole | undefined
  transactionPinConfigured: boolean
}

export const FCFA_INTEGER_AMOUNT_MESSAGE =
  'Le montant FCFA doit être un nombre entier.'

export const REMOTE_AGENT_OPERATION_COLUMNS = [
  'Date',
  'Type',
  'Référence',
  'Groupe',
  'Acteur',
  'Bénéficiaire',
  'Montant',
  'Statut',
] as const

export const REMOTE_AGENT_OPERATION_TYPE_LABELS: Record<
  RemoteAgentOperationType,
  string
> = {
  remote_agent_deposit: 'Dépôt agent',
  remote_payout_created: 'Paiement créé',
  remote_payout_paid: 'Paiement payé',
  remote_payout_canceled: 'Paiement annulé',
}

export const REMOTE_PAYOUT_PERMISSION_LABELS: Record<
  RemotePayoutPermission,
  string
> = {
  'remote_payout:view': 'Voir',
  'remote_payout:deposit': 'Dépôt',
  'remote_payout:pay': 'Paiement',
  'remote_payout:manage_group': 'Gestion groupe',
}

export function buildRemoteAgentModuleModel({
  activeMembershipId,
  groups,
  payouts,
  role,
}: BuildRemoteAgentModuleModelInput): RemoteAgentModuleModel {
  const activeAgentGroups = getActiveAgentGroups(groups, activeMembershipId)

  return {
    activeAgentGroups,
    groupRows: groups.map(toGroupRow),
    overview: buildOverview(groups, payouts),
    sections:
      role === 'manager'
        ? ['overview', 'groups', 'create-payout', 'payouts']
        : ['my-groups', 'record-deposit', 'pay-beneficiary', 'history'],
  }
}

export function getMemberDisplayName(
  member: RemoteAgentGroupMember,
): string {
  return (
    member.agentName?.trim() ||
    member.user?.name?.trim() ||
    member.agentEmail?.trim() ||
    member.user?.email?.trim() ||
    member.membership
  )
}

export function buildRemoteAgentMemberNameMap(
  groups: RemoteAgentGroup[],
): Map<string, string> {
  const memberNames = new Map<string, string>()

  for (const group of groups) {
    for (const member of group.members) {
      memberNames.set(member.membership, getRemoteAgentPaidByMemberLabel(member))
    }
  }

  return memberNames
}

export function getRemoteAgentPayoutPaidByLabel(
  payout: Pick<RemoteAgentPayout, 'paidByMembership'>,
  memberNames: ReadonlyMap<string, string>,
): string {
  if (!payout.paidByMembership) {
    return '—'
  }

  return memberNames.get(payout.paidByMembership) ?? 'Agent payé'
}

export function buildCreatePayoutResult({
  beneficiaryCode,
  payout,
}: CreatePayoutResultInput): CreatePayoutResult | null {
  if (!beneficiaryCode) {
    return null
  }

  return {
    payoutCode: payout.payoutCode,
    beneficiaryCode,
    warning: 'Ce code est affiché une seule fois.',
  }
}

export function canSubmitBeneficiaryPayment({
  beneficiaryCode,
  lookupPayout,
  transactionPin,
}: BeneficiaryPaymentState): boolean {
  return Boolean(
    lookupPayout?.status === 'pending' &&
      beneficiaryCode.trim() &&
      /^\d{6}$/.test(transactionPin),
  )
}

export function getAgentCapabilities(
  groups: RemoteAgentGroup[],
  activeMembershipId?: string | null,
): AgentCapabilities {
  const activeGroups = getActiveAgentGroups(groups, activeMembershipId)
  const depositGroups = activeGroups.filter((group) =>
    memberHasPermission(group, activeMembershipId, 'remote_payout:deposit'),
  )
  const payableGroups = activeGroups.filter((group) =>
    memberHasPermission(group, activeMembershipId, 'remote_payout:pay'),
  )

  return {
    canDeposit: depositGroups.length > 0,
    canPay: payableGroups.length > 0,
    depositGroups,
    payableGroups,
  }
}

export function buildRemoteAgentMemberPayload({
  manualMembershipId,
  permissions,
  role,
  selectedAgent,
  transactionPin,
  useManualMembershipId,
}: BuildRemoteAgentMemberPayloadInput): (RemoteAgentGroupMemberPayload & {
  transactionPin: string
}) | null {
  const membershipId = useManualMembershipId
    ? manualMembershipId.trim()
    : selectedAgent?.membershipId.trim()

  if (!membershipId) {
    return null
  }

  return {
    membershipId,
    role,
    permissions,
    transactionPin,
  }
}

export function getEligibleAgentVisibleIdentity(
  agent: RemoteEligibleAgent,
): EligibleAgentVisibleIdentity {
  const name = agent.name?.trim()
  const email = agent.email?.trim()
  const primary = name || email || 'Employé sans nom'
  const secondary = email && email !== primary ? email : null

  return { primary, secondary }
}

export function getEligibleAgentGroupStatusLabel(
  agent: RemoteEligibleAgent,
): string | null {
  if (agent.groupMemberStatus === 'active' || agent.isAlreadyInGroup) {
    return 'Déjà membre du groupe'
  }

  if (agent.groupMemberStatus === 'inactive') {
    return 'Ancien membre du groupe — peut être réactivé'
  }

  return null
}

export function getManualMembershipFallbackLabel(): string {
  return 'Saisie manuelle avancée'
}

export function parseFcfaAmountInput(value: unknown): {
  amount: number | null
  error: string | null
} {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return { amount: null, error: FCFA_INTEGER_AMOUNT_MESSAGE }
  }

  const normalized = String(value).trim()

  if (!normalized) {
    return { amount: null, error: FCFA_INTEGER_AMOUNT_MESSAGE }
  }

  if (/[,.]\d{1,2}$/.test(normalized)) {
    return { amount: null, error: FCFA_INTEGER_AMOUNT_MESSAGE }
  }

  const withoutGroupSeparators = normalized.replace(/[ .]/g, '')

  if (!/^\d+$/.test(withoutGroupSeparators)) {
    return { amount: null, error: FCFA_INTEGER_AMOUNT_MESSAGE }
  }

  const amount = Number(withoutGroupSeparators)

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { amount: null, error: FCFA_INTEGER_AMOUNT_MESSAGE }
  }

  return { amount, error: null }
}

export function formatFcfaAmount(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)} FCFA`
}

export function getGenericLookupErrorMessage(): string {
  return 'Code invalide ou expiré.'
}

export function formatPermissionLabel(permission: RemotePayoutPermission) {
  return REMOTE_PAYOUT_PERMISSION_LABELS[permission] ?? permission
}

export function getRemoteAgentOperationTypeLabel(
  type: RemoteAgentOperationType,
) {
  return REMOTE_AGENT_OPERATION_TYPE_LABELS[type] ?? type
}

export function getRemoteAgentOperationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    completed: 'Terminé',
    pending: 'En attente',
    paid: 'Payé',
    canceled: 'Annulé',
  }

  return labels[status] ?? status
}

export function buildRemoteAgentOperationDisplayRow(
  operation: RemoteAgentOperation,
): RemoteAgentOperationDisplayRow {
  return {
    actorLabel:
      operation.actorName?.trim() ||
      operation.actor?.name?.trim() ||
      operation.actorEmail?.trim() ||
      operation.actor?.email?.trim() ||
      'Acteur non renseigné',
    amountLabel: formatFcfaAmount(operation.amount),
    beneficiaryLabel: operation.beneficiaryName?.trim() || 'Non applicable',
    dateLabel: formatOperationDate(operation.date),
    groupLabel:
      operation.groupName?.trim() ||
      operation.group?.name?.trim() ||
      'Groupe autorisé',
    referenceLabel: operation.reference?.trim() || 'Sans référence',
    statusLabel: getRemoteAgentOperationStatusLabel(operation.status),
    typeLabel: getRemoteAgentOperationTypeLabel(operation.type),
  }
}

export function buildRemoteAgentDashboardModel({
  activeMembershipId,
  groups,
  now = new Date(),
  operations,
  role,
  transactionPinConfigured,
}: BuildRemoteAgentDashboardModelInput): RemoteAgentDashboardModel {
  const activeGroups = groups.filter((group) => group.status === 'active')
  const todayOperations = operations.filter((operation) =>
    isSameLocalDay(operation.date, now),
  )
  const myTodayOperations = todayOperations.filter(
    (operation) => operation.actor?.membershipId === activeMembershipId,
  )
  const sortedOperations = [...operations]
    .sort((left, right) => getTime(right.date) - getTime(left.date))
    .slice(0, 5)
  const permissions = getDashboardPermissions(activeGroups, activeMembershipId)

  return {
    activeGroups,
    agentMetrics: {
      activeGroupCount: activeGroups.length,
      myDepositsTodayAmount: sumOperations(
        myTodayOperations,
        'remote_agent_deposit',
      ),
      myPaidTodayAmount: sumOperations(
        myTodayOperations,
        'remote_payout_paid',
      ),
      myPaidTodayCount: countOperations(
        myTodayOperations,
        'remote_payout_paid',
      ),
      permissionLabels: permissions.map(formatPermissionLabel),
      permissions,
      transactionPinConfigured,
    },
    managerMetrics: {
      activeGroupCount: activeGroups.length,
      depositsTodayAmount: sumOperations(
        todayOperations,
        'remote_agent_deposit',
      ),
      paidTodayAmount: sumOperations(todayOperations, 'remote_payout_paid'),
      paidTodayCount: countOperations(todayOperations, 'remote_payout_paid'),
      pendingPayoutCount: operations.filter(
        (operation) =>
          operation.type === 'remote_payout_created' &&
          operation.status === 'pending',
      ).length,
      totalAvailableBalance: sumGroups(activeGroups, 'availableBalance'),
      totalBalance: sumGroups(activeGroups, 'balance'),
      totalReservedBalance: sumGroups(activeGroups, 'reservedBalance'),
    },
    recentOperations: sortedOperations.map(buildRemoteAgentOperationDisplayRow),
    role,
  }
}

function toGroupRow(group: RemoteAgentGroup): RemoteAgentGroupRow {
  return {
    id: group.id,
    name: group.name,
    balance: group.balance,
    reservedBalance: group.reservedBalance,
    availableBalance: group.availableBalance,
    currency: group.currency,
    status: group.status,
    memberCount: group.members.length,
  }
}

function buildOverview(
  groups: RemoteAgentGroup[],
  payouts: RemoteAgentPayout[],
): RemoteAgentOverview {
  return {
    totalBalance: sumGroups(groups, 'balance'),
    totalReservedBalance: sumGroups(groups, 'reservedBalance'),
    totalAvailableBalance: sumGroups(groups, 'availableBalance'),
    activeGroupCount: groups.filter((group) => group.status === 'active').length,
    pendingPayoutCount: payouts.filter((payout) => payout.status === 'pending')
      .length,
    paidPayoutCount: payouts.filter((payout) => payout.status === 'paid')
      .length,
    canceledPayoutCount: payouts.filter((payout) => payout.status === 'canceled')
      .length,
    hasData: groups.length > 0 || payouts.length > 0,
  }
}

function sumGroups(
  groups: RemoteAgentGroup[],
  field: 'availableBalance' | 'balance' | 'reservedBalance',
) {
  return groups.reduce((sum, group) => sum + group[field], 0)
}

function getActiveAgentGroups(
  groups: RemoteAgentGroup[],
  activeMembershipId?: string | null,
) {
  if (!activeMembershipId) {
    return []
  }

  return groups.filter(
    (group) =>
      hasCurrentMemberContext(group) ||
      group.members.some(
        (member) =>
          member.membership === activeMembershipId && member.status === 'active',
      ),
  )
}

function memberHasPermission(
  group: RemoteAgentGroup,
  activeMembershipId: string | null | undefined,
  permission: RemotePayoutPermission,
) {
  if (hasCurrentMemberContext(group)) {
    return Boolean(group.currentMemberPermissions?.includes(permission))
  }

  return group.members.some(
    (member) =>
      member.membership === activeMembershipId &&
      member.status === 'active' &&
      member.permissions.includes(permission),
  )
}

function hasCurrentMemberContext(group: RemoteAgentGroup) {
  return Array.isArray(group.currentMemberPermissions)
}

function getRemoteAgentPaidByMemberLabel(
  member: RemoteAgentGroupMember,
): string {
  return (
    member.agentName?.trim() ||
    member.user?.name?.trim() ||
    member.agentEmail?.trim() ||
    member.user?.email?.trim() ||
    'Agent payé'
  )
}

function countOperations(
  operations: RemoteAgentOperation[],
  type: RemoteAgentOperationType,
) {
  return operations.filter((operation) => operation.type === type).length
}

function sumOperations(
  operations: RemoteAgentOperation[],
  type: RemoteAgentOperationType,
) {
  return operations
    .filter((operation) => operation.type === type)
    .reduce((sum, operation) => sum + operation.amount, 0)
}

function getDashboardPermissions(
  groups: RemoteAgentGroup[],
  activeMembershipId?: string | null,
) {
  const permissions = new Set<RemotePayoutPermission>()

  for (const group of groups) {
    if (hasCurrentMemberContext(group)) {
      group.currentMemberPermissions?.forEach((permission) =>
        permissions.add(permission),
      )
      continue
    }

    const member = group.members.find(
      (groupMember) =>
        groupMember.membership === activeMembershipId &&
        groupMember.status === 'active',
    )

    member?.permissions.forEach((permission) => permissions.add(permission))
  }

  return [...permissions]
}

function formatOperationDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function isSameLocalDay(value: string, now: Date) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return date >= start && date < end
}

function getTime(value: string) {
  const time = new Date(value).getTime()

  return Number.isNaN(time) ? 0 : time
}
