import { describe, expect, it } from 'vitest'

import {
  getDetailEntries,
  getMetadataChips,
  normalizeAuditTimelineFilters,
} from './viewModel.ts'
import type { AuditTimelineEvent } from './types.ts'

describe('audit timeline view model', () => {
  it('normalizes filters and removes blank values', () => {
    expect(
      normalizeAuditTimelineFilters({
        action: ' TRANSACTION_PAY ',
        collectionName: '',
        limit: 25,
        page: 1,
        search: '  ',
      }),
    ).toEqual({
      action: 'TRANSACTION_PAY',
      limit: 25,
      page: 1,
    })
  })

  it('builds readable detail rows and metadata chips', () => {
    const objectIdBuffer = {
      buffer: {
        0: 106,
        1: 71,
        2: 172,
        3: 46,
        4: 85,
        5: 241,
        6: 180,
        7: 76,
        8: 11,
        9: 82,
        10: 146,
        11: 224,
      },
    }
    const log: AuditTimelineEvent = {
      action: 'TRANSACTION_PAY',
      actionLabel: 'Transaction paid',
      actor: { email: 'manager@akera.test', id: 'user-1', name: 'Manager' },
      category: 'transactions',
      collectionName: 'Transaction',
      details: {
        accountOperation: objectIdBuffer,
        amount: 25000,
        correspondentMembership: objectIdBuffer,
        currency: 'FCFA',
        nested: { status: 'paid', receiptNumber: 'RCT-001' },
        paidAt: {},
        paidBy: objectIdBuffer,
        paidByMembership: objectIdBuffer,
        reason: 'cash pickup',
        status: 'completed',
      },
      changes: {
        status: { from: 'pending', to: 'completed' },
      },
      id: 'log-1',
      occurredAt: '2026-07-07T10:00:00.000Z',
      targetCode: 'TRX-001',
      targetId: 'target-1',
    }

    expect(getMetadataChips(log)).toEqual([
      'Status: Completed',
      'Amount: 25,000 FCFA',
      'Reason: cash pickup',
    ])
    expect(getDetailEntries(log.details)).toEqual([
      ['Amount', '25,000 FCFA'],
      ['Nested', 'Status: Paid, Receipt number: RCT-001'],
      ['Reason', 'cash pickup'],
      ['Status', 'Completed'],
    ])
    expect(getDetailEntries(log.changes)).toEqual([
      ['Status', 'Pending -> Completed'],
    ])
  })
})
