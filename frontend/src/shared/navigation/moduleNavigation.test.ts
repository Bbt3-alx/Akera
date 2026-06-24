import { describe, expect, it } from 'vitest'

import { buildNavigationSections } from './moduleNavigation.ts'

describe('module-aware navigation', () => {
  it('hides transfer links for a gold-only company', () => {
    const sections = buildNavigationSections({
      enabledModules: [
        'gold_trading',
        'gold_buy_operations',
        'gold_sell_operations',
        'gold_shipping',
        'company_cash',
      ],
      isManager: true,
      pendingInvitationCount: 0,
      transferWorkflows: ['correspondent_collection'],
    })

    expect(flattenLabels(sections)).not.toContain('Transactions')
    expect(flattenLabels(sections)).toEqual(
      expect.arrayContaining([
        'Gold Dashboard',
        'Buy Operations',
        'Sell Operations',
        'Shipping',
        'Gold Payments',
      ]),
    )
  })

  it('hides gold links for a transfer-only company', () => {
    const sections = buildNavigationSections({
      enabledModules: [
        'transfers',
        'correspondent_collections',
        'account_operations',
        'company_cash',
        'exchange_rate',
      ],
      isManager: true,
      pendingInvitationCount: 0,
      transferWorkflows: ['correspondent_collection'],
    })

    expect(flattenLabels(sections)).toEqual(
      expect.arrayContaining([
        'Dashboard',
        'Transactions',
        'Collections',
        'Account Operations / Withdrawals',
        'Exchange Rate',
        'Company Cash',
      ]),
    )
    expect(flattenLabels(sections)).not.toContain('Buy Operations')
  })

  it('shows transfer, gold, and administration groups for a mixed company', () => {
    const sections = buildNavigationSections({
      enabledModules: [
        'transfers',
        'correspondent_collections',
        'account_operations',
        'company_cash',
        'exchange_rate',
        'gold_trading',
        'gold_buy_operations',
        'gold_sell_operations',
        'gold_shipping',
      ],
      isManager: true,
      pendingInvitationCount: 2,
      transferWorkflows: ['correspondent_collection'],
    })

    expect(sections.map((section) => section.label)).toEqual([
      'Transfers',
      'Gold Trading',
      'Administration',
    ])
    expect(flattenLabels(sections)).toEqual(
      expect.arrayContaining(['Transactions', 'Buy Operations', 'Company Cash']),
    )
  })

  it('shows operations instead of legacy transactions for remote-agent-only companies', () => {
    const sections = buildNavigationSections({
      enabledModules: [
        'transfers',
        'remote_agent_payout',
        'account_operations',
        'company_cash',
      ],
      isManager: true,
      pendingInvitationCount: 0,
      transferWorkflows: ['remote_agent_payout'],
    })

    expect(flattenLabels(sections)).toEqual(
      expect.arrayContaining([
        'Dashboard',
        'Paiements agents',
        'Opérations',
        'Account Operations / Withdrawals',
        'Company Cash',
      ]),
    )
    expect(flattenLabels(sections)).not.toContain('Transactions')
    expect(flattenLabels(sections)).not.toContain('Collections')
    expect(flattenLabels(sections)).not.toContain('Exchange Rate')
  })

  it('keeps legacy transactions visible when transfers are enabled with remote payouts', () => {
    const sections = buildNavigationSections({
      enabledModules: ['transfers', 'remote_agent_payout'],
      isManager: true,
      pendingInvitationCount: 0,
      transferWorkflows: ['correspondent_collection', 'remote_agent_payout'],
    })

    expect(flattenLabels(sections)).toEqual(
      expect.arrayContaining(['Transactions', 'Paiements agents', 'Opérations']),
    )
  })
})

function flattenLabels(
  sections: ReturnType<typeof buildNavigationSections>,
): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.label))
}
