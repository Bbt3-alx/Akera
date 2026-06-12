export type InvitationCurrency = 'FCFA' | 'GNF'

export type InvitationRole = 'partner' | 'employee'

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'revoked'

export type InvitationCompany =
  | string
  | {
      id: string
      name: string
      code?: string
      baseCurrency?: InvitationCurrency
    }

export type InvitationUserReference =
  | string
  | {
      id: string
      name?: string
      email?: string
    }

export type CompanyInvitation = {
  id: string
  email: string
  company: InvitationCompany
  role: InvitationRole
  status: InvitationStatus
  currency?: InvitationCurrency
  startingBalance?: number
  invitedBy?: InvitationUserReference
  expiresAt: string
  acceptedAt?: string
  rejectedAt?: string
  revokedAt?: string
  createdAt: string
  updatedAt: string
}

export type CreateInvitationPayload = {
  email: string
  role: InvitationRole
  currency?: InvitationCurrency
  startingBalance?: number
}

export type InvitationMembership = {
  id: string
  user?: string
  company: InvitationCompany
  role: InvitationRole
  status: 'active'
  currency?: InvitationCurrency
  balance?: number
  invitedBy?: InvitationUserReference
  permissions: string[]
  joinedAt?: string
  createdAt?: string
  updatedAt?: string
}

export type AcceptInvitationResponse = {
  invitation: CompanyInvitation
  membership: InvitationMembership | null
}
