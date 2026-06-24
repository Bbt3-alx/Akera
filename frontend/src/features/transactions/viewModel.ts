import { hasCompanyModule } from '../companies/companyModules.ts'
import type { CompanyModule } from '../companies/types.ts'

export type TransactionsEmptyStateContent = {
  actionLabel?: string
  actionTo?: string
  description: string
  title: string
}

export function getTransactionsEmptyStateContent({
  enabledModules,
}: {
  enabledModules: readonly CompanyModule[]
}): TransactionsEmptyStateContent {
  const hasLegacyTransfers = hasCompanyModule(enabledModules, 'transfers')
  const hasRemoteAgentPayout = hasCompanyModule(
    enabledModules,
    'remote_agent_payout',
  )

  if (hasRemoteAgentPayout && !hasLegacyTransfers) {
    return {
      title: 'Aucune transaction trouvée',
      description:
        'Cette page affiche les anciennes transactions. Les paiements agents sont disponibles dans Paiements agents.',
      actionLabel: 'Voir Paiements agents',
      actionTo: '/app/remote-agent-payout',
    }
  }

  return {
    title: 'No transactions found',
    description: 'Transactions matching this filter will appear here.',
  }
}
