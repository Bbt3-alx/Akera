import { hasCompanyModule } from '../companies/companyModules.ts'
import type { CompanyModule, CompanyTransferWorkflow } from '../companies/types.ts'

export type TransactionsEmptyStateContent = {
  actionLabel?: string
  actionTo?: string
  description: string
  title: string
}

export function getTransactionsEmptyStateContent({
  enabledModules,
  transferWorkflows = [],
}: {
  enabledModules: readonly CompanyModule[]
  transferWorkflows?: readonly CompanyTransferWorkflow[]
}): TransactionsEmptyStateContent {
  const hasLegacyTransfers = hasCompanyModule(enabledModules, 'transfers')
  const hasRemoteAgentPayout = hasCompanyModule(
    enabledModules,
    'remote_agent_payout',
  )
  const isCorrespondentOnly =
    hasCompanyModule(enabledModules, 'correspondent_collections') &&
    transferWorkflows.length === 1 &&
    transferWorkflows[0] === 'correspondent_collection'

  if (isCorrespondentOnly) {
    return {
      title: 'Transactions gérées dans Correspondants',
      description:
        'Les transactions de cette société sont gérées dans le module Correspondants.',
      actionLabel: 'Voir Correspondants',
      actionTo: '/app/correspondent-collections?tab=transactions',
    }
  }

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
