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

export type TransactionReceiptSnapshot = Pick<
  Transaction,
  | 'transactionCode'
  | 'beneficiaryName'
  | 'inputAmount'
  | 'inputCurrency'
  | 'companyAmount'
  | 'companyCurrency'
  | 'partnerAmount'
  | 'partnerCurrency'
  | 'exchangeRate'
  | 'processedAt'
>

export type TransactionReceipt = {
  _id: string
  id?: string
  transaction: string
  company: string
  receiptNumber: string
  snapshot: TransactionReceiptSnapshot
  signatureHash: string
  pdfPath: string
  generatedBy: string
  createdAt: string
  updatedAt: string
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

export type PayTransactionResponse = {
  transaction: Transaction
  receipt?: TransactionReceipt
}

export type CancelTransactionPayload = {
  reason?: string
}

export type ReverseTransactionPayload = {
  transactionPin: string
  reason?: string
}
