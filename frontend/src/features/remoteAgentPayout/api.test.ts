import { describe, expect, it } from 'vitest'

import { AppApiError } from '../../shared/api/types.ts'
import {
  normalizeRemoteAgentCreatePayoutResponse,
  normalizeRemoteAgentListResponse,
} from './api.ts'
import type { RemoteAgentPayout } from './types.ts'

describe('remote agent payout API helpers', () => {
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
