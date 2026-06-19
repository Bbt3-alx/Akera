import type { Membership } from '../auth/types.ts'
import type { CompanyModule } from './types.ts'

export const TRANSFER_SIGNAL_MODULES = [
  'transfers',
  'correspondent_collections',
  'remote_agent_payout',
  'account_operations',
  'exchange_rate',
] as const satisfies readonly CompanyModule[]

export const GOLD_SIGNAL_MODULES = [
  'gold_trading',
  'gold_buy_operations',
  'gold_sell_operations',
  'gold_shipping',
] as const satisfies readonly CompanyModule[]

const KNOWN_COMPANY_MODULES = new Set<CompanyModule>([
  ...TRANSFER_SIGNAL_MODULES,
  ...GOLD_SIGNAL_MODULES,
  'company_cash',
])

export function getEnabledModulesForMembership(
  membership: Membership | null | undefined,
): CompanyModule[] {
  const modules =
    membership?.company?.enabledModules ?? membership?.companyEnabledModules

  if (!Array.isArray(modules) || modules.length === 0) {
    return [
      'transfers',
      'correspondent_collections',
      'account_operations',
      'company_cash',
      'exchange_rate',
    ]
  }

  return modules.filter((moduleName): moduleName is CompanyModule =>
    KNOWN_COMPANY_MODULES.has(moduleName),
  )
}

export function hasCompanyModule(
  enabledModules: readonly CompanyModule[],
  moduleName: CompanyModule,
): boolean {
  return enabledModules.includes(moduleName)
}

export function hasAnyTransferModule(
  enabledModules: readonly CompanyModule[],
): boolean {
  return TRANSFER_SIGNAL_MODULES.some((moduleName) =>
    enabledModules.includes(moduleName),
  )
}

export function hasAnyGoldModule(
  enabledModules: readonly CompanyModule[],
): boolean {
  return GOLD_SIGNAL_MODULES.some((moduleName) =>
    enabledModules.includes(moduleName),
  )
}
