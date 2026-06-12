export type ExchangeRateCurrency = 'FCFA' | 'GNF'

export type CompanyExchangeRate = {
  id: string
  company: string
  rate: number
  from: 'FCFA'
  to: 'GNF'
  setBy: string
  createdAt: string
  updatedAt: string
}

export type UpdateExchangeRatePayload = {
  rate: number
}
