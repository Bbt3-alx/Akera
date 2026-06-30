export type CorrespondentCurrency = 'FCFA' | 'GNF'

export type CorrespondentTransactionStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'canceled'

export type CorrespondentWithdrawalStatus =
  | 'pending'
  | 'confirmed'
  | 'canceled'

export type CorrespondentSummary = {
  membershipId: string
  name: string | null
  email: string | null
  currency: CorrespondentCurrency
  balance: number
  reservedBalance: number
  availableBalance: number
  status: 'active'
}

export type RateSnapshot = {
  rateValue?: number | null
  rateBaseAmount?: number | null
  rateQuoteCurrency?: CorrespondentCurrency | null
  rateBaseCurrency?: CorrespondentCurrency | null
  counterAmount?: number | null
  counterCurrency?: CorrespondentCurrency | null
  rateNote?: string | null
}

export type CorrespondentTransaction = RateSnapshot & {
  id: string
  collectionCode: string
  amount: number
  currency: CorrespondentCurrency
  payoutAmount: number
  payoutCurrency: CorrespondentCurrency
  beneficiaryName: string
  beneficiaryPhone?: string | null
  status: CorrespondentTransactionStatus
  correspondentMembership: string
  correspondentName?: string | null
  correspondentEmail?: string | null
  note?: string | null
  paidAt?: string | null
  canceledAt?: string | null
  cancelReason?: string | null
  createdAt: string
  updatedAt: string
}

export type CorrespondentWithdrawal = RateSnapshot & {
  id: string
  deliveryCode: string
  amount: number
  currency: CorrespondentCurrency
  beneficiaryName: string
  beneficiaryPhone?: string | null
  status: CorrespondentWithdrawalStatus
  correspondentMembership: string
  correspondentName?: string | null
  correspondentEmail?: string | null
  note?: string | null
  confirmedAt?: string | null
  canceledAt?: string | null
  cancelReason?: string | null
  createdAt: string
  updatedAt: string
}

export type CorrespondentPagination = {
  page: number
  limit: number
  total: number
  pages?: number
}

export type CorrespondentListResponse<T> = {
  data: T[]
  pagination?: CorrespondentPagination
}

export type CorrespondentListParams = {
  page?: number
  limit?: number
  status?: CorrespondentTransactionStatus | CorrespondentWithdrawalStatus | ''
  search?: string
  correspondentMembershipId?: string
}

export type CreateCorrespondentTransactionPayload = {
  correspondentMembershipId?: string
  amount: number
  currency: CorrespondentCurrency
  beneficiaryName: string
  beneficiaryPhone?: string
  note?: string
  transactionPin: string
  idempotencyKey: string
}

export type PayCorrespondentTransactionPayload = {
  transactionPin: string
}

export type CancelCorrespondentTransactionPayload = {
  reason?: string
  transactionPin: string
}

export type CreateCorrespondentWithdrawalPayload = RateSnapshot & {
  correspondentMembershipId: string
  amount: number
  currency: CorrespondentCurrency
  beneficiaryName: string
  beneficiaryPhone?: string
  note?: string
  transactionPin: string
  idempotencyKey: string
}

export type ConfirmCorrespondentWithdrawalPayload = {
  transactionPin: string
}

export type CancelCorrespondentWithdrawalPayload = {
  reason?: string
  transactionPin: string
}

export type CorrespondentSelectorParams = {
  search?: string
}
