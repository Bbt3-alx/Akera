export type RemotePayoutStatus = 'pending' | 'paid' | 'canceled'

export type RemotePayoutPermission =
  | 'remote_payout:view'
  | 'remote_payout:deposit'
  | 'remote_payout:pay'
  | 'remote_payout:manage_group'

export type RemoteAgentGroupStatus = 'active' | 'inactive'

export type RemoteAgentGroupMemberRole = 'agent' | 'supervisor'

export type RemoteAgentGroupMemberStatus = 'active' | 'inactive'

export type RemoteAgentUser = {
  id: string | null
  name: string | null
  email: string | null
}

export type RemoteAgentGroupMember = {
  membership: string
  agentName: string | null
  agentEmail: string | null
  user?: RemoteAgentUser
  role: RemoteAgentGroupMemberRole
  permissions: RemotePayoutPermission[]
  status: RemoteAgentGroupMemberStatus
  joinedAt: string
  updatedAt: string
}

export type RemoteEligibleAgent = {
  membershipId: string
  userId: string | null
  name: string | null
  email: string | null
  role: 'employee'
  status: 'active'
  currency: 'FCFA'
  isAlreadyInGroup?: boolean
  groupMemberStatus?: RemoteAgentGroupMemberStatus | null
}

export type RemoteAgentGroup = {
  id: string
  name: string
  currency: 'FCFA'
  balance: number
  reservedBalance: number
  availableBalance: number
  status: RemoteAgentGroupStatus
  members: RemoteAgentGroupMember[]
  currentMemberRole?: RemoteAgentGroupMemberRole | null
  currentMemberPermissions?: RemotePayoutPermission[]
  createdAt: string
  updatedAt: string
}

export type RemoteAgentGroupsPagination = {
  page: number
  limit: number
  total: number
  pages?: number
}

export type RemoteAgentGroupsResponse = {
  data: RemoteAgentGroup[]
  pagination?: RemoteAgentGroupsPagination
}

export type RemoteAgentPayout = {
  id: string
  payoutCode: string
  amount: number
  currency: 'FCFA'
  beneficiaryName: string
  beneficiaryPhone?: string | null
  beneficiaryCodeLast4: string
  status: RemotePayoutStatus
  assignedAgentGroup: string
  paidByMembership?: string | null
  paidAt?: string | null
  canceledAt?: string | null
  cancelReason?: string | null
  createdAt: string
  updatedAt: string
}

export type RemoteAgentPayoutsPagination = {
  page: number
  limit: number
  total: number
  pages?: number
}

export type RemoteAgentPayoutsResponse = {
  data: RemoteAgentPayout[]
  pagination?: RemoteAgentPayoutsPagination
}

export type RemoteAgentDeposit = {
  id: string
  operationCode?: string
  amount: number
  currency: 'FCFA'
  previousBalance?: number
  currentBalance?: number
  reference?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export type RemoteAgentDepositPayload = {
  amount: number
  currency: 'FCFA'
  method: 'cash' | 'bank' | 'mobile_money' | 'other'
  reference?: string
  note?: string
  transactionPin: string
  idempotencyKey: string
}

export type RemoteAgentGroupCreatePayload = {
  name: string
  members?: RemoteAgentGroupMemberPayload[]
  transactionPin: string
}

export type RemoteAgentGroupUpdatePayload = {
  name?: string
  status?: RemoteAgentGroupStatus
  transactionPin: string
}

export type RemoteAgentGroupMemberPayload = {
  membershipId: string
  role: RemoteAgentGroupMemberRole
  permissions: RemotePayoutPermission[]
}

export type RemoteAgentGroupMemberUpdatePayload = {
  role?: RemoteAgentGroupMemberRole
  permissions?: RemotePayoutPermission[]
  status?: RemoteAgentGroupMemberStatus
  transactionPin: string
}

export type RemoteAgentPayoutCreatePayload = {
  assignedAgentGroupId: string
  amount: number
  currency: 'FCFA'
  beneficiaryName: string
  beneficiaryPhone?: string
  note?: string
  transactionPin: string
  idempotencyKey: string
}

export type RemoteAgentPayoutPayPayload = {
  beneficiaryCode: string
  transactionPin: string
  paymentIdempotencyKey: string
}

export type RemoteAgentPayoutLookupPayload = {
  beneficiaryCode: string
}

export type RemoteAgentPayoutCancelPayload = {
  reason?: string
  transactionPin: string
}

export type RemoteAgentPayoutCreateResponse = {
  payout: RemoteAgentPayout
  beneficiaryCode?: string
}

export type RemoteAgentListParams = {
  page?: number
  limit?: number
  status?: RemotePayoutStatus | RemoteAgentGroupStatus
  search?: string
}

export type RemoteEligibleAgentListParams = {
  search?: string
  groupId?: string
  limit?: number
}
