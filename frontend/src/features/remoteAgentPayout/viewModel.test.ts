import { describe, expect, it } from 'vitest'

import {
  buildCreatePayoutResult,
  buildRemoteAgentModuleModel,
  buildRemoteAgentMemberPayload,
  canSubmitBeneficiaryPayment,
  FCFA_INTEGER_AMOUNT_MESSAGE,
  formatFcfaAmount,
  getEligibleAgentGroupStatusLabel,
  getEligibleAgentVisibleIdentity,
  getAgentCapabilities,
  getGenericLookupErrorMessage,
  getManualMembershipFallbackLabel,
  getMemberDisplayName,
  parseFcfaAmountInput,
} from './viewModel.ts'
import type {
  RemoteEligibleAgent,
  RemoteAgentGroup,
  RemoteAgentPayout,
} from './types.ts'

describe('remote agent payout view model', () => {
  it('lets managers see group rows and manager sections', () => {
    const model = buildRemoteAgentModuleModel({
      activeMembershipId: 'manager-membership',
      groups: [createGroup({ name: 'Agents Bamako' })],
      payouts: [
        createPayout({ status: 'pending' }),
        createPayout({ id: 'payout-2', payoutCode: 'RAP-0002', status: 'paid' }),
        createPayout({
          id: 'payout-3',
          payoutCode: 'RAP-0003',
          status: 'canceled',
        }),
      ],
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
    expect(model.overview).toEqual(
      expect.objectContaining({
        pendingPayoutCount: 1,
        paidPayoutCount: 1,
        canceledPayoutCount: 1,
      }),
    )
  })

  it('normalizes FCFA integer input with spaces and dot group separators', () => {
    expect(parseFcfaAmountInput('1000000')).toEqual({
      amount: 1000000,
      error: null,
    })
    expect(parseFcfaAmountInput('1 000 000')).toEqual({
      amount: 1000000,
      error: null,
    })
    expect(parseFcfaAmountInput('1.000.000')).toEqual({
      amount: 1000000,
      error: null,
    })
  })

  it('rejects decimal FCFA amount input', () => {
    expect(parseFcfaAmountInput('999999.99')).toEqual({
      amount: null,
      error: FCFA_INTEGER_AMOUNT_MESSAGE,
    })
    expect(parseFcfaAmountInput('999999,99')).toEqual({
      amount: null,
      error: FCFA_INTEGER_AMOUNT_MESSAGE,
    })
  })

  it('formats FCFA amounts without fraction digits', () => {
    expect(formatFcfaAmount(1000000)).toBe('1\u202f000\u202f000 FCFA')
    expect(formatFcfaAmount(999999.99)).toBe('1\u202f000\u202f000 FCFA')
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

  it('derives active agent groups from my-groups current member metadata', () => {
    const groups = [
      createGroup({
        currentMemberRole: 'agent',
        currentMemberPermissions: [
          'remote_payout:view',
          'remote_payout:deposit',
          'remote_payout:pay',
        ],
        members: [
          {
            membership: 'other-membership',
            agentName: 'Other Agent',
            agentEmail: 'other@example.com',
            user: {
              id: 'user-2',
              name: 'Other Agent',
              email: 'other@example.com',
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

    const model = buildRemoteAgentModuleModel({
      activeMembershipId: 'agent-membership',
      groups,
      payouts: [],
      role: 'employee',
    })

    expect(model.activeAgentGroups).toEqual(groups)
    expect(getAgentCapabilities(groups, 'agent-membership')).toEqual({
      canDeposit: true,
      canPay: true,
      payableGroups: groups,
      depositGroups: groups,
    })
  })

  it('builds add member payload from the selected eligible agent membershipId', () => {
    const payload = buildRemoteAgentMemberPayload({
      manualMembershipId: '',
      permissions: ['remote_payout:view', 'remote_payout:pay'],
      role: 'agent',
      selectedAgent: createEligibleAgent({
        membershipId: 'membership-selected',
        userId: 'user-raw-id',
      }),
      transactionPin: '123456',
      useManualMembershipId: false,
    })

    expect(payload).toEqual({
      membershipId: 'membership-selected',
      role: 'agent',
      permissions: ['remote_payout:view', 'remote_payout:pay'],
      transactionPin: '123456',
    })
  })

  it('uses manual membershipId only for the advanced fallback', () => {
    const payload = buildRemoteAgentMemberPayload({
      manualMembershipId: 'manual-membership',
      permissions: ['remote_payout:view'],
      role: 'supervisor',
      selectedAgent: null,
      transactionPin: '123456',
      useManualMembershipId: true,
    })

    expect(payload?.membershipId).toBe('manual-membership')
    expect(getManualMembershipFallbackLabel()).toBe('Saisie manuelle avancée')
  })

  it('does not expose raw ids as eligible agent visible identity', () => {
    const identity = getEligibleAgentVisibleIdentity(
      createEligibleAgent({
        membershipId: 'membership-raw-id',
        userId: 'user-raw-id',
        name: 'Awa Traore',
        email: 'awa@example.com',
      }),
    )

    expect(identity).toEqual({
      primary: 'Awa Traore',
      secondary: 'awa@example.com',
    })
    expect(JSON.stringify(identity)).not.toContain('membership-raw-id')
    expect(JSON.stringify(identity)).not.toContain('user-raw-id')
  })

  it('labels inactive group members as reactivatable', () => {
    expect(
      getEligibleAgentGroupStatusLabel(
        createEligibleAgent({ groupMemberStatus: 'inactive' }),
      ),
    ).toBe('Ancien membre du groupe — peut être réactivé')
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

function createEligibleAgent(
  overrides: Partial<RemoteEligibleAgent> = {},
): RemoteEligibleAgent {
  return {
    membershipId: 'membership-1',
    userId: 'user-1',
    name: 'Awa Traore',
    email: 'awa@example.com',
    role: 'employee',
    status: 'active',
    currency: 'FCFA',
    isAlreadyInGroup: false,
    groupMemberStatus: null,
    ...overrides,
  }
}
