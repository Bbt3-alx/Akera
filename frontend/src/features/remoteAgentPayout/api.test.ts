import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '../../shared/api/http.ts'
import { AppApiError } from '../../shared/api/types.ts'
import {
  listEligibleRemoteAgents,
  listRemoteAgentOperations,
  listRemoteAgentGroups,
  listMyRemoteAgentGroups,
  normalizeRemoteAgentListParams,
  normalizeRemoteAgentCreatePayoutResponse,
  normalizeRemoteAgentListResponse,
} from './api.ts'
import type { RemoteAgentGroup, RemoteAgentListParams, RemoteAgentPayout } from './types.ts'

describe('remote agent payout API helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the employee my-groups endpoint', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: [createGroup()],
    })

    const response = await listMyRemoteAgentGroups()

    expect(get).toHaveBeenCalledWith('/remote-agent-payouts/my-groups')
    expect(response.data[0].name).toBe('Agents Bamako')
  })

  it('keeps manager group listing on the manager groups endpoint', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: [createGroup()],
    })

    await listRemoteAgentGroups({ status: 'active' })

    expect(get).toHaveBeenCalledWith('/remote-agent-payouts/groups', {
      params: { status: 'active' },
    })
  })

  it('calls the eligible agents endpoint with search, group and limit params', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: [],
    })

    await listEligibleRemoteAgents({
      search: 'awa',
      groupId: 'group-1',
      limit: 50,
    })

    expect(get).toHaveBeenCalledWith('/remote-agent-payouts/eligible-agents', {
      params: {
        search: 'awa',
        groupId: 'group-1',
        limit: 50,
      },
    })
  })

  it('calls the operations endpoint with search, type, status and pagination params', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: [createOperation()],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const response = await listRemoteAgentOperations({
      page: 1,
      limit: 20,
      search: 'awa',
      status: 'paid',
      type: 'remote_payout_paid',
    })

    expect(get).toHaveBeenCalledWith('/remote-agent-payouts/operations', {
      params: {
        page: 1,
        limit: 20,
        search: 'awa',
        status: 'paid',
        type: 'remote_payout_paid',
      },
    })
    expect(response.data[0].actorName).toBe('Moussa Keita')
  })

  it('omits empty optional status query params', () => {
    expect(
      normalizeRemoteAgentListParams({
        page: 1,
        limit: 50,
        status: '' as RemoteAgentListParams['status'],
        search: ' ',
      }),
    ).toEqual({ page: 1, limit: 50 })

    expect(
      normalizeRemoteAgentListParams({
        status: null as unknown as RemoteAgentListParams['status'],
      }),
    ).toEqual({})
  })

  it('normalizes paginated list responses from totalPages to pages', () => {
    const response = normalizeRemoteAgentListResponse({
      success: true,
      data: [createPayout()],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    expect(response.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      pages: 1,
    })
    expect(response.data[0].payoutCode).toBe('RAP-0001')
  })

  it('keeps beneficiaryCode only on create payout responses', () => {
    expect(
      normalizeRemoteAgentCreatePayoutResponse({
        success: true,
        data: {
          payout: createPayout(),
          beneficiaryCode: '12345678',
        },
      }),
    ).toEqual({
      payout: createPayout(),
      beneficiaryCode: '12345678',
    })
  })

  it('throws AppApiError for API error envelopes', () => {
    expect(() =>
      normalizeRemoteAgentListResponse({
        success: false,
        code: 403,
        message: 'Access denied',
        errorCode: 'REMOTE_AGENT_PAYOUT_ACCESS_DENIED',
      }),
    ).toThrow(AppApiError)
  })
})

function createPayout(): RemoteAgentPayout {
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
  }
}

function createGroup(): RemoteAgentGroup {
  return {
    id: 'group-1',
    name: 'Agents Bamako',
    currency: 'FCFA',
    balance: 100_000,
    reservedBalance: 25_000,
    availableBalance: 75_000,
    status: 'active',
    members: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  }
}

function createOperation() {
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
  }
}
