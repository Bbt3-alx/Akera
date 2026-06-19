import { describe, expect, it } from 'vitest'

import { toCreateCompanyPayload } from './onboarding.ts'

describe('company onboarding payload', () => {
  it('sends the selected business type when creating a company', () => {
    expect(
      toCreateCompanyPayload({
        name: 'Akera Gold',
        address: 'Bamako',
        contact: '+22370000000',
        baseCurrency: 'FCFA',
        businessType: 'transfer',
        transferWorkflowSelection: 'remote_agent_payout',
      }),
    ).toEqual({
      name: 'Akera Gold',
      address: 'Bamako',
      contact: '+22370000000',
      baseCurrency: 'FCFA',
      businessType: 'transfer',
      transferWorkflows: ['remote_agent_payout'],
    })
  })
})
