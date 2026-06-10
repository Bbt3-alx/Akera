export type AuthRole = 'manager' | 'employee' | 'partner'

export type MembershipStatus = 'active' | 'invited' | 'suspended'

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  isVerified: boolean
}

export type Membership = {
  membershipId: string
  companyId: string
  companyName: string
  role: AuthRole
  status: MembershipStatus
  permissions: string[]
}

export type AuthPayload = {
  accessToken: string
  user: AuthUser
  memberships: Membership[]
}

export type SignupResponse = {
  user: AuthUser
  memberships: Membership[]
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
}

export type VerifyEmailPayload = {
  code: string
}

export type ResendVerificationPayload = {
  email: string
}

export type ResendVerificationResponse = {
  message: string
}
