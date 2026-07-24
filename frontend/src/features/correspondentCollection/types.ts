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

export type CorrespondentInputSide = 'account' | 'company'

export type CorrespondentConversionDirection = 'GNF_TO_FCFA' | 'FCFA_TO_GNF'

export type CorrespondentTransaction = RateSnapshot & {
  id: string
  transactionCode: string
  amount: number
  currency: CorrespondentCurrency
  payoutAmount: number
  payoutCurrency: CorrespondentCurrency
  inputAmount?: number | null
  inputCurrency?: CorrespondentCurrency | null
  inputSide?: CorrespondentInputSide | null
  conversionDirection?: CorrespondentConversionDirection | null
  beneficiaryName: string
  beneficiaryPhone?: string | null
  status: CorrespondentTransactionStatus
  correspondentMembership: string
  correspondentName?: string | null
  correspondentEmail?: string | null
  note?: string | null
  createdBy?: string | null
  createdByName?: string | null
  confirmedBy?: string | null
  confirmedByName?: string | null
  confirmedAt?: string | null
  paidBy?: string | null
  paidByName?: string | null
  paidAt?: string | null
  canceledBy?: string | null
  canceledByName?: string | null
  canceledAt?: string | null
  cancelReason?: string | null
  createdAt: string
  updatedAt: string
}

export type CorrespondentWithdrawal = RateSnapshot & {
  id: string
  deliveryCode?: string | null
  referenceCode?: string | null
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
  amount?: number
  currency?: CorrespondentCurrency
  inputAmount?: number
  inputCurrency?: CorrespondentCurrency
  inputSide?: CorrespondentInputSide
  beneficiaryName: string
  beneficiaryPhone?: string
  note?: string
  transactionPin: string
  idempotencyKey: string
}

export type PayCorrespondentTransactionPayload = {
  transactionPin: string
}

export type CorrespondentModificationRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'

export type CorrespondentModificationTargetType = 'collection' | 'delivery'

export type CorrespondentModificationRequest = {
  id: string
  targetType: CorrespondentModificationTargetType
  targetId: string
  oldValues: Record<string, unknown>
  requestedValues: Record<string, unknown>
  reason?: string | null
  decisionReason?: string | null
  initiatedBy?: string | null
  initiatedByName?: string | null
  initiatedByMembership?: string | null
  approvedBy?: string | null
  approvedByName?: string | null
  approvedByMembership?: string | null
  status: CorrespondentModificationRequestStatus
  decidedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type CorrespondentModificationRequestPayload = {
  requestedValues: Record<string, unknown>
  reason?: string
}

export type CorrespondentModificationDecisionPayload = {
  transactionPin: string
  reason?: string
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
