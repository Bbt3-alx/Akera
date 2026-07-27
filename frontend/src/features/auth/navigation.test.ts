import { describe, expect, it } from 'vitest'

import { getSafeReturnTo } from './navigation.ts'

describe('getSafeReturnTo', () => {
  it('keeps an internal application destination', () => {
    expect(getSafeReturnTo('/invitations/ABCD234567')).toBe(
      '/invitations/ABCD234567',
    )
  })

  it('rejects external and protocol-relative destinations', () => {
    expect(getSafeReturnTo('https://evil.example')).toBeNull()
    expect(getSafeReturnTo('//evil.example')).toBeNull()
  })
})
