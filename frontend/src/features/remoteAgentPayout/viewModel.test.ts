import { describe, expect, it } from 'vitest'

import {
  buildCreatePayoutResult,
  buildRemoteAgentModuleModel,
  canSubmitBeneficiaryPayment,
  getAgentCapabilities,
  getGenericLookupErrorMessage,
  getMemberDisplayName,
} from './viewModel.ts'
import type {
  RemoteAgentGroup,
  RemoteAgentPayout,
} from './types.ts'

describe('remote agent payout view model', () => {
  it('lets managers see group rows and manager sections', () => {
    const model = buildRemoteAgentModuleModel({
      activeMembershipId: 'manager-membership',
      groups: [createGroup({ name: 'Agents Bamako' })],
      payouts: [createPayout({ status: 'pending' })],
      role: 'manager',
    })

    expect(model.sections).toEqual([
      'overview',
      'groups',
      'create-payout',
      'payouts',
    ])
    expect(model.groupRows).toEqual([
      expect.objectContaining({
        name: 'Agents Bamako',
        memberCount: 1,
      }),
    ])
    expect(model.overview.pendingPayoutCount).toBe(1)
  })

  it('renders group members with agentName instead of raw membership id', () => {
    expect(
      getMemberDisplayName(
        createGroup().members[0],
      ),
    ).toBe('Awa Traore')
  })

  it('keeps the created beneficiary code in a one-time success result', () => {
    const result = buildCreatePayoutResult({
      payout: createPayout({ payoutCode: 'RAP-0001' }),
      beneficiaryCode: '12345678',
    })

    expect(result).toEqual({
      payoutCode: 'RAP-0001',
      beneficiaryCode: '12345678',
      warning: 'Ce code est affiché une seule fois.',
    })
  })

  it('requires a successful lookup before beneficiary payment can be submitted', () => {
    expect(
      canSubmitBeneficiaryPayment({
        beneficiaryCode: '12345678',
        lookupPayout: null,
        transactionPin: '123456',
      }),
    ).toBe(false)

    expect(
      canSubmitBeneficiaryPayment({
        beneficiaryCode: '12345678',
        lookupPayout: createPayout({ status: 'pending' }),
        transactionPin: '123456',
      }),
    ).toBe(true)
  })

  it('derives deposit and payment visibility from active group permissions', () => {
    const groups = [
      createGroup({
        members: [
          {
            membership: 'agent-membership',
            agentName: 'Awa Traore',
            agentEmail: 'awa@example.com',
            user: {
              id: 'user-1',
              name: 'Awa Traore',
              email: 'awa@example.com',
            },
            role: 'agent',
            permissions: ['remote_payout:view'],
            status: 'active',
            joinedAt: '2026-06-01T00:00:00.000Z',
            updatedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      }),
    ]

    expect(getAgentCapabilities(groups, 'agent-membership')).toEqual({
      canDeposit: false,
      canPay: false,
      payableGroups: [],
      depositGroups: [],
    })

    groups[0].members[0].permissions = [
      'remote_payout:view',
      'remote_payout:deposit',
      'remote_payout:pay',
    ]

    expect(getAgentCapabilities(groups, 'agent-membership')).toEqual({
      canDeposit: true,
      canPay: true,
      payableGroups: [groups[0]],
      depositGroups: [groups[0]],
    })
  })

  it('uses a generic message for failed beneficiary lookups', () => {
    expect(getGenericLookupErrorMessage()).toBe('Code invalide ou expiré.')
  })
})

function createGroup(
  overrides: Partial<RemoteAgentGroup> = {},
): RemoteAgentGroup {
  return {
    id: 'group-1',
    name: 'Agents Bamako',
    currency: 'FCFA',
    balance: 100_000,
    reservedBalance: 30_000,
    availableBalance: 70_000,
    status: 'active',
    members: [
      {
        membership: 'member-1',
        agentName: 'Awa Traore',
        agentEmail: 'awa@example.com',
        user: {
          id: 'user-1',
          name: 'Awa Traore',
          email: 'awa@example.com',
        },
        role: 'agent',
        permissions: [
          'remote_payout:view',
          'remote_payout:deposit',
          'remote_payout:pay',
        ],
        status: 'active',
        joinedAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function createPayout(
  overrides: Partial<RemoteAgentPayout> = {},
): RemoteAgentPayout {
  return {
    id: 'payout-1',
    payoutCode: 'RAP-0001',
    amount: 25_000,
    currency: 'FCFA',
    beneficiaryName: 'Moussa Diarra',
    beneficiaryPhone: '+22370000000',
    beneficiaryCodeLast4: '5678',
    status: 'pending',
    assignedAgentGroup: 'group-1',
    paidByMembership: null,
    paidAt: null,
    canceledAt: null,
    cancelReason: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}
