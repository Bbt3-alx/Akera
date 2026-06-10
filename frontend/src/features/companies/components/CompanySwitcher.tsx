import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../store.ts'

export function CompanySwitcher() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useMe()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const setActiveCompanyId = useCompaniesStore(
    (state) => state.setActiveCompanyId,
  )
  const memberships = data?.memberships ?? []
  const activeMembership = memberships.find(
    (membership) => membership.companyId === activeCompanyId,
  )

  function handleCompanyChange(companyId: string) {
    if (!companyId || companyId === activeCompanyId) {
      return
    }

    setActiveCompanyId(companyId)
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    })
    navigate('/app')
  }

  if (memberships.length > 1) {
    return (
      <div className="min-w-0">
        <label
          className="block text-xs font-medium uppercase text-slate-500"
          htmlFor="company-switcher"
        >
          Company
        </label>
        <select
          className="mt-1 w-full min-w-56 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          id="company-switcher"
          onChange={(event) => handleCompanyChange(event.target.value)}
          value={activeCompanyId ?? ''}
        >
          {memberships.map((membership) => (
            <option key={membership.membershipId} value={membership.companyId}>
              {membership.companyName}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase text-slate-500">
        Company
      </div>
      <div className="mt-1 truncate text-sm font-medium text-slate-900">
        {activeMembership?.companyName ?? 'No company selected'}
      </div>
    </div>
  )
}
