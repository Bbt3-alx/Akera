export type TransactionCurrency = 'FCFA' | 'GNF'

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'canceling'
  | 'canceled'
  | 'reversing'
  | 'reversed'
  | 'archived'

export type Transaction = {
  _id: string
  id?: string
  transactionCode: string
  company: string
  membership: string
  partner?: {
    membershipId: string
    userId: string
    name: string
    email: string
  } | null
  inputAmount: number
  inputCurrency: TransactionCurrency
  partnerAmount: number
  partnerCurrency: TransactionCurrency
  companyAmount: number
  companyCurrency: TransactionCurrency
  exchangeRate?: number | null
  beneficiaryName: string
  description?: string
  status: TransactionStatus
  idempotencyKey: string
  createdBy: string
  processedBy?: string
  processedAt?: string
  canceledAt?: string | null
  cancelReason?: string
  reversedAt?: string
  reversedBy?: string
  reversedReason?: string
  createdAt: string
  updatedAt: string
}

export type TransactionReceipt = {
  id: string
  receiptNumber: string
  transaction: string
  company: string
  amount: number
  currency: TransactionCurrency
  createdAt: string
  downloadUrl: string
}

export type TransactionsPagination = {
  page?: number
  limit?: number
  total?: number
  pages?: number
}

export type ListTransactionsParams = {
  page?: number
  limit?: number
  status?: TransactionStatus
}

export type ListTransactionsResponse = {
  data: Transaction[]
  pagination?: TransactionsPagination
}

export type CreateTransactionPayload = {
  inputAmount: number
  inputCurrency: TransactionCurrency
  beneficiaryName: string
  description?: string
  idempotencyKey: string
}

export type CreateTransactionResponse = {
  transaction: Transaction
}

export type PayTransactionResponse = {
  transaction: Transaction
  receipt?: TransactionReceipt | null
}

export type CancelTransactionResponse = {
  transaction: Transaction
}

export type CancelTransactionPayload = {
  reason?: string
}

export type ReverseTransactionPayload = {
  transactionPin: string
  reason?: string
}

export type ReverseTransactionResponse = {
  transaction: Transaction
}
