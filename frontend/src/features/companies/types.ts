export type CompanyCurrency = 'FCFA' | 'GNF'

export type CompanyBusinessType = 'transfer' | 'gold_trading' | 'mixed'

export type CompanyTransferWorkflow =
  | 'correspondent_collection'
  | 'remote_agent_payout'

export type TransferWorkflowSelection = CompanyTransferWorkflow | 'both'

export type CompanyModule =
  | 'transfers'
  | 'correspondent_collections'
  | 'remote_agent_payout'
  | 'account_operations'
  | 'gold_trading'
  | 'gold_buy_operations'
  | 'gold_sell_operations'
  | 'gold_shipping'
  | 'company_cash'
  | 'exchange_rate'

export type CreateCompanyPayload = {
  name: string
  address: string
  contact: string
  baseCurrency: CompanyCurrency
  businessType: CompanyBusinessType
  transferWorkflows?: CompanyTransferWorkflow[]
}

export type CreatedCompany = {
  id: string
  name: string
  code: string
  baseCurrency: CompanyCurrency
  currency: CompanyCurrency
  businessType: CompanyBusinessType
  transferWorkflows: CompanyTransferWorkflow[]
  enabledModules: CompanyModule[]
}

export type CreatedCompanyMembership = {
  membershipId: string
  companyId: string
  companyName: string
  role: 'manager'
  status: 'active'
  permissions: string[]
}

export type CreateCompanyResponse = {
  company: CreatedCompany
  membership: CreatedCompanyMembership
}
