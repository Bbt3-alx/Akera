export type CompanyCurrency = 'FCFA' | 'GNF'

export type CreateCompanyPayload = {
  name: string
  address: string
  contact: string
  baseCurrency: CompanyCurrency
}

export type CreatedCompany = {
  id: string
  name: string
  code: string
  baseCurrency: CompanyCurrency
  currency: CompanyCurrency
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
