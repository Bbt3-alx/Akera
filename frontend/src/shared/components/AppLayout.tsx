import { Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-6 md:block">
        <div className="text-lg font-semibold">Akera</div>
        <div className="mt-8 text-sm text-slate-500">Sidebar Placeholder</div>
      </aside>
      <div className="md:pl-64">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="text-sm font-medium text-slate-600">
            Topbar Placeholder
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
