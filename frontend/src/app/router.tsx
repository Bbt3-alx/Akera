import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RegisterPage } from '../features/auth/pages/RegisterPage.tsx'
import { LoginPage } from '../features/auth/pages/LoginPage.tsx'
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage.tsx'
import { CompanyCashPage } from '../features/companyCash/pages/CompanyCashPage.tsx'
import { CreateCompanyPage } from '../features/companies/pages/CreateCompanyPage.tsx'
import { CompanySelectPage } from '../features/companies/pages/CompanySelectPage.tsx'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.tsx'
import { CompanyExchangeRatePage } from '../features/exchangeRates/pages/CompanyExchangeRatePage.tsx'
import { CompanyInvitationsPage } from '../features/invitations/pages/CompanyInvitationsPage.tsx'
import { MyInvitationsPage } from '../features/invitations/pages/MyInvitationsPage.tsx'
import { TransactionPinPage } from '../features/security/pages/TransactionPinPage.tsx'
import { CreateTransactionPage } from '../features/transactions/pages/CreateTransactionPage.tsx'
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
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
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
        path: 'transactions/new',
        element: <CreateTransactionPage />,
      },
      {
        path: 'transactions/:transactionCode',
        element: <TransactionDetailsPage />,
      },
      {
        path: 'invitations',
        element: <MyInvitationsPage />,
      },
      {
        path: 'company/invitations',
        element: <CompanyInvitationsPage />,
      },
      {
        path: 'company/exchange-rate',
        element: <CompanyExchangeRatePage />,
      },
      {
        path: 'company/cash',
        element: <CompanyCashPage />,
      },
      {
        path: 'security/transaction-pin',
        element: <TransactionPinPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
])
