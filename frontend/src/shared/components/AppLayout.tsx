import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useMe } from '../../features/auth/hooks.ts'
import { useAuthStore } from '../../features/auth/store.ts'
import { getEnabledModulesForMembership } from '../../features/companies/companyModules.ts'
import { CompanySwitcher } from '../../features/companies/components/CompanySwitcher.tsx'
import { useCompaniesStore } from '../../features/companies/store.ts'
import { useMyInvitations } from '../../features/invitations/hooks.ts'
import {
  buildNavigationSections,
  type NavigationItem,
  type NavigationSection,
} from '../navigation/moduleNavigation.ts'

export function AppLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useMe()
  const myInvitationsQuery = useMyInvitations()
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
  const canManageCompanySettings = activeMembership?.role === 'manager'
  const pendingInvitationCount =
    myInvitationsQuery.data?.filter(
      (invitation) => invitation.status === 'pending',
    ).length ?? 0
  const navigationSections = buildNavigationSections({
    enabledModules: getEnabledModulesForMembership(activeMembership),
    isManager: canManageCompanySettings,
    pendingInvitationCount,
    transferWorkflows:
      activeMembership?.company?.transferWorkflows ??
      activeMembership?.companyTransferWorkflows,
  })

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

        <SidebarNavigation sections={navigationSections} />
      </aside>

      <div className="md:pl-64">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="md:hidden">
              <div className="text-lg font-semibold">Akera</div>
              <TopbarNavigation sections={navigationSections} />
            </div>

            <CompanySwitcher />

            <div className="flex min-w-0 items-center justify-between gap-3 md:justify-end">
              <div className="min-w-0 text-left md:text-right">
                <div className="truncate text-sm font-medium text-slate-900">
                  {userDisplayName}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {user?.email}
                </div>
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

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

type NavigationProps = {
  sections: NavigationSection[]
}

function SidebarNavigation({ sections }: NavigationProps) {
  return (
    <nav className="mt-8 space-y-5">
      {sections.map((section, sectionIndex) => (
        <div key={section.label ?? `main-${sectionIndex}`}>
          {section.label ? (
            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {section.label}
            </div>
          ) : null}
          <div className="space-y-1">
            {section.items.map((item) => (
              <SidebarLink key={item.to} to={item.to}>
                <NavigationLabel item={item} />
              </SidebarLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function TopbarNavigation({ sections }: NavigationProps) {
  return (
    <nav className="mt-3 flex flex-wrap gap-2">
      {sections.flatMap((section) =>
        section.items.map((item) => (
          <TopbarLink key={item.to} to={item.to}>
            <NavigationLabel item={item} />
          </TopbarLink>
        )),
      )}
    </nav>
  )
}

function NavigationLabel({ item }: { item: NavigationItem }) {
  return <NavLabel count={item.count}>{item.label}</NavLabel>
}

type AppNavLinkProps = {
  children: React.ReactNode
  end?: boolean
  to: string
}

type NavLabelProps = {
  children: React.ReactNode
  count?: number
}

function NavLabel({ children, count = 0 }: NavLabelProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="truncate">{children}</span>
      {count > 0 ? (
        <span className="inline-flex min-w-5 justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
          {count}
        </span>
      ) : null}
    </span>
  )
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
          'inline-flex items-center rounded px-3 py-2 text-sm font-medium transition',
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
