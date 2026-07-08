import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '../../shared/api/http.ts'
import { AppApiError } from '../../shared/api/types.ts'
import { listAuditTimelineEvents } from './api.ts'

describe('audit timeline API helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes audit timeline filters as query params', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({
      success: true,
      data: {
        logs: [],
        pagination: { page: 1, limit: 25, total: 0, pages: 0 },
        summary: { total: 0, today: 0, security: 0 },
      },
    })

    await listAuditTimelineEvents({
      action: 'TRANSACTION_PAY',
      collectionName: 'Transaction',
      from: '2026-07-01',
      limit: 25,
      page: 2,
      search: 'TRX',
      to: '2026-07-07',
    })

    expect(get).toHaveBeenCalledWith('/audit-logs', {
      params: {
        action: 'TRANSACTION_PAY',
        collectionName: 'Transaction',
        from: '2026-07-01',
        limit: 25,
        page: 2,
        search: 'TRX',
        to: '2026-07-07',
      },
    })
  })

  it('throws app API errors from unsuccessful responses', async () => {
    vi.spyOn(http, 'get').mockResolvedValue({
      success: false,
      code: 403,
      message: 'Only managers can view audit logs',
      errorCode: 'AUDIT_MANAGER_REQUIRED',
    })

    await expect(listAuditTimelineEvents()).rejects.toBeInstanceOf(AppApiError)
  })
})
