export type TransactionPinStatus = {
  configured: boolean
}

export type SetupTransactionPinPayload = {
  transactionPin: string
  currentPassword: string
}

export type ChangeTransactionPinPayload = {
  currentTransactionPin: string
  newTransactionPin: string
  currentPassword: string
}
