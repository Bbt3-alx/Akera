import { describe, expect, it } from 'vitest'

import { AppApiError } from '../../shared/api/types.ts'
import {
  buildRemoteAgentDashboardModel,
  buildRemoteAgentMemberNameMap,
  buildRemoteAgentOperationDisplayRow,
  buildCreatePayoutResult,
  buildRemoteAgentModuleModel,
  buildRemoteAgentMemberPayload,
  canSubmitBeneficiaryPayment,
  FCFA_INTEGER_AMOUNT_MESSAGE,
  formatFcfaAmount,
  getActiveRemoteAgentGroups,
  getAutoSelectedRemoteAgentGroupId,
  getEligibleAgentGroupStatusLabel,
  getEligibleAgentVisibleIdentity,
  getAgentCapabilities,
  getGenericLookupErrorMessage,
  getManualMembershipFallbackLabel,
  getMemberDisplayName,
  getRemoteAgentDashboardQuickActions,
  getRemoteAgentPayoutErrorMessage,
  getRemoteAgentPayoutPaidByLabel,
  getRemoteAgentOperationTypeLabel,
  resolveRemoteAgentTab,
  REMOTE_AGENT_OPERATION_COLUMNS,
  parseFcfaAmountInput,
} from './viewModel.ts'
import type {
  RemoteEligibleAgent,
  RemoteAgentGroup,
  RemoteAgentOperation,
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

    expect(
      getMemberDisplayName({
        ...createGroup().members[0],
        membership: 'membership-raw-id',
        agentName: null,
        agentEmail: null,
        user: {
          id: 'user-1',
          name: null,
          email: null,
        },
      }),
    ).toBe('Agent sans nom')
  })

  it('builds paid-by labels from agentName before email and never raw ids', () => {
    const memberNames = buildRemoteAgentMemberNameMap([
      createGroup({
        members: [
          {
            ...createGroup().members[0],
            membership: 'membership-raw-id',
            agentName: 'Moussa Keita',
            agentEmail: 'moussa@example.com',
          },
          {
            ...createGroup().members[0],
            membership: 'membership-email-only',
            agentName: null,
            agentEmail: 'fallback@example.com',
            user: {
              id: 'user-email-only',
              name: null,
              email: 'fallback@example.com',
            },
          },
          {
            ...createGroup().members[0],
            membership: 'membership-no-display',
            agentName: null,
            agentEmail: null,
            user: {
              id: 'user-no-display',
              name: null,
              email: null,
            },
          },
        ],
      }),
    ])

    expect(
      getRemoteAgentPayoutPaidByLabel(
        createPayout({ paidByMembership: 'membership-raw-id' }),
        memberNames,
      ),
    ).toBe('Moussa Keita')
    expect(
      getRemoteAgentPayoutPaidByLabel(
        createPayout({ paidByMembership: 'membership-email-only' }),
        memberNames,
      ),
    ).toBe('fallback@example.com')
    expect(
      getRemoteAgentPayoutPaidByLabel(
        createPayout({ paidByMembership: 'membership-no-display' }),
        memberNames,
      ),
    ).toBe('Agent payé')
    expect([...memberNames.values()].join(' ')).not.toContain(
      'membership-raw-id',
    )
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

  it('auto-selects the only active group for create payout', () => {
    const activeGroups = getActiveRemoteAgentGroups([
      createGroup({ id: 'group-1', status: 'active' }),
    ])

    expect(
      getAutoSelectedRemoteAgentGroupId({
        groups: activeGroups,
        selectedGroupId: '',
      }),
    ).toBe('group-1')
  })

  it('does not auto-select create payout group when multiple active groups exist', () => {
    const activeGroups = getActiveRemoteAgentGroups([
      createGroup({ id: 'group-1', status: 'active' }),
      createGroup({ id: 'group-2', status: 'active' }),
    ])

    expect(
      getAutoSelectedRemoteAgentGroupId({
        groups: activeGroups,
        selectedGroupId: '',
      }),
    ).toBe('')
  })

  it('does not override an existing available group selection', () => {
    const activeGroups = getActiveRemoteAgentGroups([
      createGroup({ id: 'group-1', status: 'active' }),
      createGroup({ id: 'group-2', status: 'active' }),
    ])

    expect(
      getAutoSelectedRemoteAgentGroupId({
        groups: activeGroups,
        selectedGroupId: 'group-2',
      }),
    ).toBe('group-2')
  })

  it('auto-selects the only deposit-enabled group', () => {
    const capabilities = getAgentCapabilities(
      [
        createGroup({
          id: 'deposit-group',
          currentMemberPermissions: [
            'remote_payout:view',
            'remote_payout:deposit',
          ],
        }),
      ],
      'agent-membership',
    )

    expect(
      getAutoSelectedRemoteAgentGroupId({
        groups: capabilities.depositGroups,
        selectedGroupId: '',
      }),
    ).toBe('deposit-group')
  })

  it('does not auto-select deposit group when multiple deposit-enabled groups exist', () => {
    const capabilities = getAgentCapabilities(
      [
        createGroup({
          id: 'deposit-group-1',
          currentMemberPermissions: [
            'remote_payout:view',
            'remote_payout:deposit',
          ],
        }),
        createGroup({
          id: 'deposit-group-2',
          currentMemberPermissions: [
            'remote_payout:view',
            'remote_payout:deposit',
          ],
        }),
      ],
      'agent-membership',
    )

    expect(
      getAutoSelectedRemoteAgentGroupId({
        groups: capabilities.depositGroups,
        selectedGroupId: '',
      }),
    ).toBe('')
  })

  it('does not auto-select inactive groups', () => {
    const activeGroups = getActiveRemoteAgentGroups([
      createGroup({ id: 'inactive-group', status: 'inactive' }),
    ])

    expect(
      getAutoSelectedRemoteAgentGroupId({
        groups: activeGroups,
        selectedGroupId: '',
      }),
    ).toBe('')
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
    expect(getManualMembershipFallbackLabel()).toBe('Saisie manuelle support')
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

  it('maps remote payout API errors to field-friendly French messages', () => {
    expect(
      getRemoteAgentPayoutErrorMessage(
        new AppApiError({
          errorCode: 'PIN_NOT_CONFIGURED',
          message: 'PIN not configured',
          statusCode: 400,
        }),
      ),
    ).toBe('Configurez votre PIN de transaction avant de continuer.')
    expect(
      getRemoteAgentPayoutErrorMessage(
        new AppApiError({
          errorCode: 'INVALID_PIN',
          message: 'Invalid PIN',
          statusCode: 400,
        }),
      ),
    ).toBe('PIN de transaction invalide.')
    expect(
      getRemoteAgentPayoutErrorMessage(
        new AppApiError({
          errorCode: 'REMOTE_PAYOUT_DEPOSIT_PERMISSION_REQUIRED',
          message: 'Deposit permission is required',
          statusCode: 403,
        }),
      ),
    ).toBe("Vous n'avez pas la permission d'enregistrer un dépôt pour ce groupe.")
    expect(
      getRemoteAgentPayoutErrorMessage(
        new AppApiError({
          errorCode: 'INSUFFICIENT_AGENT_GROUP_AVAILABLE_BALANCE',
          message: 'Insufficient balance',
          statusCode: 400,
        }),
      ),
    ).toBe('Solde disponible du groupe insuffisant.')
    expect(
      getRemoteAgentPayoutErrorMessage(
        new AppApiError({
          errorCode: 'MEMBER_ALREADY_IN_GROUP',
          message: 'Member already belongs',
          statusCode: 409,
        }),
      ),
    ).toBe('Cet employé est déjà membre actif de ce groupe.')
    expect(
      getRemoteAgentPayoutErrorMessage(
        new AppApiError({
          errorCode: 'REMOTE_PAYOUT_ALREADY_PAID',
          message: 'Already paid',
          statusCode: 409,
        }),
      ),
    ).toBe('Ce paiement a déjà été payé.')
    expect(
      getRemoteAgentPayoutErrorMessage(
        new Error('Network unavailable'),
      ),
    ).toBe('Network unavailable')
  })

  it('uses actor-facing operation columns and friendly operation labels', () => {
    expect(REMOTE_AGENT_OPERATION_COLUMNS).toEqual([
      'Date',
      'Type',
      'Référence',
      'Groupe',
      'Acteur',
      'Bénéficiaire',
      'Montant',
      'Statut',
    ])
    expect(REMOTE_AGENT_OPERATION_COLUMNS).not.toContain('Agent')
    expect(getRemoteAgentOperationTypeLabel('remote_agent_deposit')).toBe(
      'Dépôt agent',
    )
    expect(getRemoteAgentOperationTypeLabel('remote_payout_created')).toBe(
      'Paiement créé',
    )
    expect(getRemoteAgentOperationTypeLabel('remote_payout_paid')).toBe(
      'Paiement payé',
    )
    expect(getRemoteAgentOperationTypeLabel('remote_payout_canceled')).toBe(
      'Paiement annulé',
    )
  })

  it('builds operation display rows without raw ids as primary labels', () => {
    const row = buildRemoteAgentOperationDisplayRow(
      createOperation({
        actor: {
          membershipId: 'membership-raw-id',
          name: 'Moussa Keita',
          email: 'moussa@example.com',
          role: 'employee',
        },
        actorName: 'Moussa Keita',
        actorEmail: 'moussa@example.com',
      }),
    )

    expect(row).toEqual(
      expect.objectContaining({
        typeLabel: 'Paiement payé',
        referenceLabel: 'RAP-0001',
        groupLabel: 'Agents Bamako',
        actorLabel: 'Moussa Keita',
        beneficiaryLabel: 'Awa Traore',
        amountLabel: '25\u202f000 FCFA',
        statusLabel: 'Payé',
      }),
    )
    expect(Object.values(row).join(' ')).not.toContain('membership-raw-id')
  })

  it('builds manager and agent dashboard metrics from authorized operations', () => {
    const today = new Date('2026-06-24T12:00:00.000Z')
    const operations: RemoteAgentOperation[] = [
      createOperation({
        id: 'remote_agent_deposit:deposit-1',
        type: 'remote_agent_deposit',
        date: '2026-06-24T08:00:00.000Z',
        reference: 'DEP-0001',
        actor: {
          membershipId: 'agent-membership',
          name: 'Awa Traore',
          email: 'awa@example.com',
          role: 'employee',
        },
        actorName: 'Awa Traore',
        actorEmail: 'awa@example.com',
        beneficiaryName: null,
        amount: 10_000,
        status: 'completed',
      }),
      createOperation({
        id: 'remote_payout_paid:payout-1',
        type: 'remote_payout_paid',
        date: '2026-06-24T10:00:00.000Z',
        actor: {
          membershipId: 'agent-membership',
          name: 'Awa Traore',
          email: 'awa@example.com',
          role: 'employee',
        },
        actorName: 'Awa Traore',
        actorEmail: 'awa@example.com',
      }),
      createOperation({
        id: 'remote_payout_created:payout-2',
        type: 'remote_payout_created',
        date: '2026-06-24T09:00:00.000Z',
        reference: 'RAP-0002',
        beneficiaryName: 'Hidden Pending Beneficiary',
        amount: 40_000,
        status: 'pending',
      }),
    ]

    const manager = buildRemoteAgentDashboardModel({
      activeMembershipId: 'manager-membership',
      groups: [createGroup()],
      now: today,
      operations,
      role: 'manager',
      transactionPinConfigured: true,
    })

    expect(manager.managerMetrics).toEqual(
      expect.objectContaining({
        activeGroupCount: 1,
        depositsTodayAmount: 10_000,
        paidTodayCount: 1,
        paidTodayAmount: 25_000,
        pendingPayoutCount: 1,
        totalAvailableBalance: 70_000,
      }),
    )

    const agent = buildRemoteAgentDashboardModel({
      activeMembershipId: 'agent-membership',
      groups: [createGroup()],
      now: today,
      operations,
      role: 'employee',
      transactionPinConfigured: false,
    })

    expect(agent.agentMetrics).toEqual(
      expect.objectContaining({
        activeGroupCount: 1,
        myDepositsTodayAmount: 10_000,
        myPaidTodayAmount: 25_000,
        myPaidTodayCount: 1,
        transactionPinConfigured: false,
      }),
    )
    expect(JSON.stringify(agent)).not.toContain('pendingBeneficiaries')
  })

  it('resolves manager query-param tabs and falls back from agent tabs', () => {
    expect(resolveRemoteAgentTab('manager', 'create-payout')).toBe(
      'create-payout',
    )
    expect(resolveRemoteAgentTab('manager', 'groups')).toBe('groups')
    expect(resolveRemoteAgentTab('manager', 'record-deposit')).toBe('overview')
  })

  it('resolves agent query-param tabs and falls back from manager tabs', () => {
    expect(resolveRemoteAgentTab('employee', 'record-deposit')).toBe(
      'record-deposit',
    )
    expect(resolveRemoteAgentTab('employee', 'pay-beneficiary')).toBe(
      'pay-beneficiary',
    )
    expect(resolveRemoteAgentTab('employee', 'create-payout')).toBe('my-groups')
  })

  it('builds manager dashboard quick actions with tab deep links', () => {
    expect(
      getRemoteAgentDashboardQuickActions({
        role: 'manager',
        permissions: [],
      }),
    ).toEqual([
      {
        label: 'Créer un paiement agent',
        to: '/app/remote-agent-payout?tab=create-payout',
      },
      {
        label: 'Gérer les groupes',
        to: '/app/remote-agent-payout?tab=groups',
      },
      { label: 'Voir les opérations', to: '/app/operations' },
      { label: 'Configurer le PIN', to: '/app/security/transaction-pin' },
    ])
  })

  it('builds agent dashboard quick actions from available permissions', () => {
    expect(
      getRemoteAgentDashboardQuickActions({
        role: 'employee',
        permissions: ['remote_payout:deposit', 'remote_payout:pay'],
      }),
    ).toEqual([
      {
        label: 'Enregistrer un dépôt',
        to: '/app/remote-agent-payout?tab=record-deposit',
      },
      {
        label: 'Payer un bénéficiaire',
        to: '/app/remote-agent-payout?tab=pay-beneficiary',
      },
      { label: 'Voir mes opérations', to: '/app/operations' },
      { label: 'Configurer mon PIN', to: '/app/security/transaction-pin' },
    ])
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

function createOperation(
  overrides: Partial<RemoteAgentOperation> = {},
): RemoteAgentOperation {
  return {
    id: 'remote_payout_paid:payout-1',
    date: '2026-06-24T10:00:00.000Z',
    type: 'remote_payout_paid',
    reference: 'RAP-0001',
    group: {
      id: 'group-1',
      name: 'Agents Bamako',
    },
    groupName: 'Agents Bamako',
    actor: {
      membershipId: 'membership-1',
      name: 'Moussa Keita',
      email: 'moussa@example.com',
      role: 'employee',
    },
    actorName: 'Moussa Keita',
    actorEmail: 'moussa@example.com',
    beneficiaryName: 'Awa Traore',
    amount: 25_000,
    currency: 'FCFA',
    status: 'paid',
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
