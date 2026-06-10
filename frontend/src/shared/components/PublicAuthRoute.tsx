import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useMe } from '../../features/auth/hooks.ts'
import { useAuthStore } from '../../features/auth/store.ts'
import { useCompaniesStore } from '../../features/companies/store.ts'
import { AppApiError } from '../api/types.ts'

type PublicAuthRouteProps = {
  children: ReactNode
}

export function PublicAuthRoute({ children }: PublicAuthRouteProps) {
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearAccessToken = useAuthStore((state) => state.clearAccessToken)
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const clearActiveCompanyId = useCompaniesStore(
    (state) => state.clearActiveCompanyId,
  )
  const meQuery = useMe()
  const isUnauthorized = isUnauthorizedError(meQuery.error)
  const user = meQuery.data?.user
  const isVerifyEmailRoute = location.pathname === '/verify-email'

  useEffect(() => {
    if (isUnauthorized) {
      clearAccessToken()
      clearActiveCompanyId()
    }
  }, [clearAccessToken, clearActiveCompanyId, isUnauthorized])

  if (!accessToken || isUnauthorized) {
    return children
  }

  if (meQuery.isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return children
  }

  if (!user.isVerified) {
    if (isVerifyEmailRoute) {
      return children
    }

    return (
      <Navigate
        replace
        to={`/verify-email?email=${encodeURIComponent(user.email)}`}
      />
    )
  }

  if (activeCompanyId) {
    return <Navigate to="/app" replace />
  }

  return <Navigate to="/select-company" replace />
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
