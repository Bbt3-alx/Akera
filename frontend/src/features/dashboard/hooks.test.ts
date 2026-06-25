import { describe, expect, it } from 'vitest'

import { createCompanyDashboardQueryOptions, dashboardKeys } from './hooks.ts'

describe('company dashboard query options', () => {
  it('does not retry failed dashboard requests indefinitely', () => {
    const options = createCompanyDashboardQueryOptions('company-1')

    expect(options.queryKey).toEqual(dashboardKeys.all('company-1'))
    expect(options.enabled).toBe(true)
    expect(options.retry).toBe(false)
  })

  it('stays disabled until a company is selected', () => {
    const options = createCompanyDashboardQueryOptions(null)

    expect(options.enabled).toBe(false)
  })
})
