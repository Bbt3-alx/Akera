import {
  hasAnyGoldModule,
  hasAnyTransferModule,
  hasCompanyModule,
} from '../../features/companies/companyModules.ts'
import type { CompanyModule } from '../../features/companies/types.ts'

export type NavigationItem = {
  count?: number
  label: string
  to: string
}

export type NavigationSection = {
  items: NavigationItem[]
  label: string | null
}

type BuildNavigationSectionsInput = {
  enabledModules: readonly CompanyModule[]
  isManager: boolean
  pendingInvitationCount: number
}

export function buildNavigationSections({
  enabledModules,
  isManager,
  pendingInvitationCount,
}: BuildNavigationSectionsInput): NavigationSection[] {
  const hasTransfer = hasAnyTransferModule(enabledModules)
  const hasGold = hasAnyGoldModule(enabledModules)
  const isMixed = hasTransfer && hasGold
  const transferItems = getTransferItems(enabledModules)
  const goldItems = getGoldItems(enabledModules, isMixed)
  const administrationItems = getAdministrationItems({
    enabledModules,
    isManager,
    pendingInvitationCount,
  })

  if (isMixed) {
    return [
      { label: 'Transfers', items: transferItems },
      { label: 'Gold Trading', items: goldItems },
      { label: 'Administration', items: administrationItems },
    ].filter((section) => section.items.length > 0)
  }

  return [
    {
      label: null,
      items: [...transferItems, ...goldItems, ...administrationItems],
    },
  ]
}

function getTransferItems(
  enabledModules: readonly CompanyModule[],
): NavigationItem[] {
  const items: NavigationItem[] = []

  if (hasAnyTransferModule(enabledModules)) {
    items.push({ label: 'Dashboard', to: '/app/dashboard' })
  }

  if (hasCompanyModule(enabledModules, 'transfers')) {
    items.push({ label: 'Transactions', to: '/app/transactions' })
  }

  if (hasCompanyModule(enabledModules, 'correspondent_collections')) {
    items.push({ label: 'Collections', to: '/app/collections' })
  }

  if (hasCompanyModule(enabledModules, 'remote_agent_payout')) {
    items.push({ label: 'Paiements agents', to: '/app/remote-agent-payout' })
  }

  if (hasCompanyModule(enabledModules, 'account_operations')) {
    items.push({
      label: 'Account Operations / Withdrawals',
      to: '/app/account-operations',
    })
  }

  return items
}

function getGoldItems(
  enabledModules: readonly CompanyModule[],
  isMixed: boolean,
): NavigationItem[] {
  const items: NavigationItem[] = []

  if (hasAnyGoldModule(enabledModules)) {
    items.push({
      label: 'Gold Dashboard',
      to: isMixed ? '/app/gold/dashboard' : '/app/dashboard',
    })
  }

  if (hasCompanyModule(enabledModules, 'gold_buy_operations')) {
    items.push({ label: 'Buy Operations', to: '/app/gold/buy-operations' })
  }

  if (hasCompanyModule(enabledModules, 'gold_sell_operations')) {
    items.push({ label: 'Sell Operations', to: '/app/gold/sell-operations' })
  }

  if (hasCompanyModule(enabledModules, 'gold_shipping')) {
    items.push({ label: 'Shipping', to: '/app/gold/shipping' })
  }

  if (hasCompanyModule(enabledModules, 'gold_trading')) {
    items.push({ label: 'Gold Payments', to: '/app/gold/payments' })
  }

  return items
}

function getAdministrationItems({
  enabledModules,
  isManager,
  pendingInvitationCount,
}: BuildNavigationSectionsInput): NavigationItem[] {
  const items: NavigationItem[] = [
    {
      count: pendingInvitationCount,
      label: 'Invitations',
      to: '/app/invitations',
    },
  ]

  if (!isManager) {
    return items
  }

  items.push({ label: 'Company invites', to: '/app/company/invitations' })

  if (hasCompanyModule(enabledModules, 'exchange_rate')) {
    items.push({ label: 'Exchange Rate', to: '/app/company/exchange-rate' })
  }

  if (hasCompanyModule(enabledModules, 'company_cash')) {
    items.push({ label: 'Company Cash', to: '/app/company/cash' })
  }

  items.push({
    label: 'Transaction PIN',
    to: '/app/security/transaction-pin',
  })

  return items
}
