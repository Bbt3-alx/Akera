import { describe, expect, it } from 'vitest'

import { getTransactionsEmptyStateContent } from './viewModel.ts'

describe('transactions view model', () => {
  it('clarifies that remote agent payouts live outside legacy transactions', () => {
    expect(
      getTransactionsEmptyStateContent({
        enabledModules: ['remote_agent_payout'],
      }),
    ).toEqual({
      title: 'Aucune transaction trouvée',
      description:
        'Cette page affiche les anciennes transactions. Les paiements agents sont disponibles dans Paiements agents.',
      actionLabel: 'Voir Paiements agents',
      actionTo: '/app/remote-agent-payout',
    })
  })

  it('keeps the generic empty state when legacy transfers are enabled', () => {
    expect(
      getTransactionsEmptyStateContent({
        enabledModules: ['transfers', 'remote_agent_payout'],
      }).description,
    ).toBe('Transactions matching this filter will appear here.')
  })

  it('redirects correspondent-only companies to the Correspondants module', () => {
    expect(
      getTransactionsEmptyStateContent({
        enabledModules: ['transfers', 'correspondent_collections'],
        transferWorkflows: ['correspondent_collection'],
      }),
    ).toEqual({
      title: 'Transactions gérées dans Correspondants',
      description:
        'Les transactions de cette société sont gérées dans le module Correspondants.',
      actionLabel: 'Voir Correspondants',
      actionTo: '/app/correspondent-collections?tab=transactions',
    })
  })
})
