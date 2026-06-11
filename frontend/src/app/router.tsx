import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RegisterPage } from '../features/auth/pages/RegisterPage.tsx'
import { LoginPage } from '../features/auth/pages/LoginPage.tsx'
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage.tsx'
import { CreateCompanyPage } from '../features/companies/pages/CreateCompanyPage.tsx'
import { CompanySelectPage } from '../features/companies/pages/CompanySelectPage.tsx'
import { TransactionDetailsPage } from '../features/transactions/pages/TransactionDetailsPage.tsx'
import { TransactionSearchPage } from '../features/transactions/pages/TransactionSearchPage.tsx'
import { TransactionsPage } from '../features/transactions/pages/TransactionsPage.tsx'
import { AppLayout } from '../shared/components/AppLayout.tsx'
import { ProtectedRoute } from '../shared/components/ProtectedRoute.tsx'
import { PublicAuthRoute } from '../shared/components/PublicAuthRoute.tsx'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicAuthRoute>
        <LoginPage />
      </PublicAuthRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicAuthRoute>
        <RegisterPage />
      </PublicAuthRoute>
    ),
  },
  {
    path: '/verify-email',
    element: (
      <PublicAuthRoute>
        <VerifyEmailPage />
      </PublicAuthRoute>
    ),
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
      {
        path: 'transactions/search',
        element: <TransactionSearchPage />,
      },
      {
        path: 'transactions/:transactionCode',
        element: <TransactionDetailsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
])
