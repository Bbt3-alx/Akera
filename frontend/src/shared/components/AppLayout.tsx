import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useMe } from '../../features/auth/hooks.ts'
import { useAuthStore } from '../../features/auth/store.ts'
import { CompanySwitcher } from '../../features/companies/components/CompanySwitcher.tsx'
import { useCompaniesStore } from '../../features/companies/store.ts'

export function AppLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useMe()
  const clearAccessToken = useAuthStore((state) => state.clearAccessToken)
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const clearActiveCompanyId = useCompaniesStore(
    (state) => state.clearActiveCompanyId,
  )
  const user = data?.user
  const userDisplayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'User'
  const activeCompanyName =
    data?.memberships.find(
      (membership) => membership.companyId === activeCompanyId,
    )?.companyName ?? 'No company selected'
  const activeMembership = data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const canManageInvitations = activeMembership?.role === 'manager'

  function handleLogout() {
    clearAccessToken()
    clearActiveCompanyId()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-6 md:flex md:flex-col">
        <div>
          <div className="text-xl font-semibold">Akera</div>
          <div className="mt-2 text-sm text-slate-500">
            {activeCompanyName}
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          <SidebarLink end to="/app">
            Dashboard
          </SidebarLink>
          <SidebarLink to="/app/transactions">Transactions</SidebarLink>
          {canManageInvitations ? (
            <SidebarLink to="/app/company/invitations">
              Invitations
            </SidebarLink>
          ) : null}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="md:hidden">
              <div className="text-lg font-semibold">Akera</div>
              <nav className="mt-3 flex gap-2">
                <TopbarLink end to="/app">
                  Dashboard
                </TopbarLink>
                <TopbarLink to="/app/transactions">Transactions</TopbarLink>
                {canManageInvitations ? (
                  <TopbarLink to="/app/company/invitations">
                    Invitations
                  </TopbarLink>
                ) : null}
              </nav>
            </div>

            <CompanySwitcher />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">
                  {userDisplayName}
                </div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <button
                className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

type AppNavLinkProps = {
  children: React.ReactNode
  end?: boolean
  to: string
}

function SidebarLink({ children, end, to }: AppNavLinkProps) {
  return (
    <NavLink
      className={({ isActive }) =>
        [
          'block rounded px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-slate-950 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
      end={end}
      to={to}
    >
      {children}
    </NavLink>
  )
}

function TopbarLink({ children, end, to }: AppNavLinkProps) {
  return (
    <NavLink
      className={({ isActive }) =>
        [
          'rounded px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-slate-950 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
      end={end}
      to={to}
    >
      {children}
    </NavLink>
  )
}
