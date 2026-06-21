import type { AuthRole } from '../auth/types.ts'
import type {
  RemoteAgentGroup,
  RemoteAgentGroupMember,
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

export function getGenericLookupErrorMessage(): string {
  return 'Code invalide ou expiré.'
}

export function formatPermissionLabel(permission: RemotePayoutPermission) {
  return REMOTE_PAYOUT_PERMISSION_LABELS[permission] ?? permission
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
