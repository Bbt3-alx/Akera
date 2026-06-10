import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useMe } from '../../auth/hooks.ts'
import { useAuthStore } from '../../auth/store.ts'
import { AppApiError } from '../../../shared/api/types.ts'
import { useCompaniesStore } from '../store.ts'

export function CompanySelectPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearAccessToken = useAuthStore((state) => state.clearAccessToken)
  const clearActiveCompanyId = useCompaniesStore(
    (state) => state.clearActiveCompanyId,
  )
  const setActiveCompanyId = useCompaniesStore(
    (state) => state.setActiveCompanyId,
  )
  const meQuery = useMe()
  const memberships = meQuery.data?.memberships
  const onlyCompanyId =
    memberships?.length === 1 ? memberships[0]?.companyId : null
  const isUnauthorized = isUnauthorizedError(meQuery.error)

  useEffect(() => {
    if (isUnauthorized) {
      clearAccessToken()
      clearActiveCompanyId()
    }
  }, [clearAccessToken, clearActiveCompanyId, isUnauthorized])

  useEffect(() => {
    if (onlyCompanyId) {
      setActiveCompanyId(onlyCompanyId)
      navigate('/app', { replace: true })
    }
  }, [navigate, onlyCompanyId, setActiveCompanyId])

  function handleLogout() {
    clearAccessToken()
    clearActiveCompanyId()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  if (!accessToken || isUnauthorized) {
    return <Navigate to="/login" replace />
  }

  if (meQuery.isLoading) {
    return <CompanySelectShell>Loading...</CompanySelectShell>
  }

  if (meQuery.isError) {
    return (
      <CompanySelectShell>
        Unable to load your company access. Please try again.
      </CompanySelectShell>
    )
  }

  if (!memberships || memberships.length === 0) {
    return (
      <CompanySelectShell>
        <h1 className="text-2xl font-semibold">No company access yet</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Create your company to start using Akera, or wait for an invitation
          from an existing company.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded bg-slate-300 px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed"
            disabled
            type="button"
          >
            Coming next
          </button>
          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      </CompanySelectShell>
    )
  }

  if (memberships.length === 1) {
    return <CompanySelectShell>Redirecting...</CompanySelectShell>
  }

  return (
    <CompanySelectShell>
      <div className="w-full">
        <h1 className="text-2xl font-semibold">Select Company</h1>
        <div className="mt-6 space-y-3">
          {memberships.map((membership) => (
            <button
              className="w-full rounded border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50"
              key={membership.membershipId}
              onClick={() => {
                setActiveCompanyId(membership.companyId)
                navigate('/app')
              }}
              type="button"
            >
              <div className="font-medium text-slate-950">
                {membership.companyName}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                <span>{membership.role}</span>
                <span aria-hidden="true">-</span>
                <span>{membership.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </CompanySelectShell>
  )
}

type CompanySelectShellProps = {
  children: React.ReactNode
}

function CompanySelectShell({ children }: CompanySelectShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
      <section className="w-full max-w-md rounded border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </section>
    </main>
  )
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AppApiError && error.statusCode === 401
}
