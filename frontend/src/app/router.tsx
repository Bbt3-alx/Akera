import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RegisterPage } from '../features/auth/pages/RegisterPage.tsx'
import { LoginPage } from '../features/auth/pages/LoginPage.tsx'
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage.tsx'
import { CreateCompanyPage } from '../features/companies/pages/CreateCompanyPage.tsx'
import { CompanySelectPage } from '../features/companies/pages/CompanySelectPage.tsx'
import { TransactionsPage } from '../features/transactions/pages/TransactionsPage.tsx'
import { AppLayout } from '../shared/components/AppLayout.tsx'
import { ProtectedRoute } from '../shared/components/ProtectedRoute.tsx'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/select-company',
    element: (
      <ProtectedRoute requireCompany={false}>
        <CompanySelectPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/create-company',
    element: (
      <ProtectedRoute requireCompany={false}>
        <CreateCompanyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <section className="rounded border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Welcome to Akera
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your company workspace is ready. Dashboard metrics will appear
              here later.
            </p>
          </section>
        ),
      },
      {
        path: 'transactions',
        element: <TransactionsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
])
