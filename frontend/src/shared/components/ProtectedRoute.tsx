import { useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useMe } from '../../features/auth/hooks.ts'
import { useAuthStore } from '../../features/auth/store.ts'
import { useCompaniesStore } from '../../features/companies/store.ts'
import { AppApiError } from '../api/types.ts'

type ProtectedRouteProps = {
  children: ReactNode
  requireCompany?: boolean
}

export function ProtectedRoute({
  children,
  requireCompany = true,
}: ProtectedRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const hydrateAccessToken = useAuthStore((state) => state.hydrateAccessToken)
  const clearAccessToken = useAuthStore((state) => state.clearAccessToken)
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const hydrateActiveCompanyId = useCompaniesStore(
    (state) => state.hydrateActiveCompanyId,
  )
  const clearActiveCompanyId = useCompaniesStore(
    (state) => state.clearActiveCompanyId,
  )
  const meQuery = useMe()
  const isUnauthorized = isUnauthorizedError(meQuery.error)
  const unverifiedEmail =
    meQuery.data?.user.isVerified === false ? meQuery.data.user.email : null

  useEffect(() => {
    if (!accessToken) {
      hydrateAccessToken()
    }

    if (!activeCompanyId) {
      hydrateActiveCompanyId()
    }
  }, [
    accessToken,
    activeCompanyId,
    hydrateAccessToken,
    hydrateActiveCompanyId,
  ])

  useEffect(() => {
    if (isUnauthorized) {
      clearAccessToken()
      clearActiveCompanyId()
    }
  }, [clearAccessToken, clearActiveCompanyId, isUnauthorized])

  useEffect(() => {
    if (unverifiedEmail && activeCompanyId) {
      clearActiveCompanyId()
    }
  }, [activeCompanyId, clearActiveCompanyId, unverifiedEmail])

  if (accessToken && meQuery.isLoading) {
    return <LoadingScreen />
  }

  if (!accessToken || isUnauthorized) {
    return <Navigate to="/login" replace />
  }

  if (unverifiedEmail) {
    return (
      <Navigate
        replace
        to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
      />
    )
  }

  if (requireCompany && !activeCompanyId) {
    return <Navigate to="/select-company" replace />
  }

  return children
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
      Loading...
    </div>
  )
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AppApiError && error.statusCode === 401
}
