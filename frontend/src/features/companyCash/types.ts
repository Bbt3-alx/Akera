export type CompanyCashCurrency = 'FCFA' | 'GNF'

export type CompanyCashDepositMethod =
  | 'cash'
  | 'bank'
  | 'mobile_money'
  | 'other'

export type CompanyCashBalance = {
  balance: number
  currency: CompanyCashCurrency
}

export type CompanyCashDeposit = {
  id: string
  company: string
  type: 'deposit'
  amount: number
  currency: CompanyCashCurrency
  method: CompanyCashDepositMethod
  reference?: string
  note?: string
  previousBalance: number
  currentBalance: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type CreateCompanyCashDepositPayload = {
  amount: number
  currency: CompanyCashCurrency
  method: CompanyCashDepositMethod
  reference?: string
  note?: string
  transactionPin: string
  idempotencyKey: string
}

export type CompanyCashDepositResponse = {
  deposit: CompanyCashDeposit
  balance: {
    previous: number
    current: number
    currency: CompanyCashCurrency
  }
}
