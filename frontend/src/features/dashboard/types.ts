export type DashboardCurrency = 'FCFA' | 'GNF'

export type DashboardRole = 'manager' | 'employee' | 'partner' | string

export type DashboardTransactionScope = 'company' | 'mine'

export type DashboardTransactionCounts = {
  pending: number
  processing: number
  completed: number
  canceled: number
  reversed: number
  total: number
}

export type DashboardTransactionTotals = {
  completedCompanyAmount: number
  pendingCompanyAmount: number
  todayCompletedCompanyAmount: number
}

export type DashboardTransaction = {
  id: string
  transactionCode: string
  status: string
  inputAmount: number
  inputCurrency: DashboardCurrency
  companyAmount: number
  companyCurrency: DashboardCurrency
  beneficiaryName: string
  partner?: {
    id?: string
    membershipId?: string
    userId?: string
    name?: string
    email?: string
  } | null
  createdAt: string
  processedAt?: string | null
}

export type CompanyDashboard = {
  company: {
    id: string
    name: string
    baseCurrency: DashboardCurrency
  }
  viewer: {
    role: DashboardRole
  }
  exchangeRate: {
    configured: boolean
    rate: number | null
    from: 'FCFA'
    to: 'GNF'
    updatedAt: string | null
  }
  cash: {
    visible: boolean
    balance: number | null
    currency: DashboardCurrency | null
  }
  transactions: {
    scope: DashboardTransactionScope
    counts: DashboardTransactionCounts
    totals: DashboardTransactionTotals
    recent: DashboardTransaction[]
  }
  invitations: {
    visible: boolean
    pendingCount: number | null
  }
  accounting: {
    visible: boolean
    trialBalance: Record<string, unknown> | null
  }
}
