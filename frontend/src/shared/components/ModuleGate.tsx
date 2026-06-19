import type { ReactNode } from 'react'

import { useMe } from '../../features/auth/hooks.ts'
import {
  getEnabledModulesForMembership,
  hasCompanyModule,
} from '../../features/companies/companyModules.ts'
import { useCompaniesStore } from '../../features/companies/store.ts'
import type { CompanyModule } from '../../features/companies/types.ts'
import { ModulePlaceholderPage } from './ModulePlaceholderPage.tsx'

type ModuleGateProps = {
  children: ReactNode
  moduleName: CompanyModule
}

export function ModuleGate({ children, moduleName }: ModuleGateProps) {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const { data, isLoading } = useMe()
  const activeMembership = data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const enabledModules = getEnabledModulesForMembership(activeMembership)

  if (isLoading) {
    return (
      <ModulePlaceholderPage
        description="Checking the active company modules."
        title="Loading module"
      />
    )
  }

  if (!activeCompanyId || !hasCompanyModule(enabledModules, moduleName)) {
    return (
      <ModulePlaceholderPage
        description="This module is not enabled for the active company."
        title="Module unavailable"
      />
    )
  }

  return children
}
