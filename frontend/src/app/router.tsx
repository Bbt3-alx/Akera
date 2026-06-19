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
import { ModuleGate } from '../shared/components/ModuleGate.tsx'
import { ModulePlaceholderPage } from '../shared/components/ModulePlaceholderPage.tsx'
import { ProtectedRoute } from '../shared/components/ProtectedRoute.tsx'
import { PublicAuthRoute } from '../shared/components/PublicAuthRoute.tsx'
import { RouteErrorFallback } from '../shared/components/RouteErrorFallback.tsx'

const routeErrorElement = <RouteErrorFallback />

export const router = createBrowserRouter([
  {
    path: '/login',
    errorElement: routeErrorElement,
    element: (
      <PublicAuthRoute>
        <LoginPage />
      </PublicAuthRoute>
    ),
  },
  {
    path: '/register',
    errorElement: routeErrorElement,
    element: (
      <PublicAuthRoute>
        <RegisterPage />
      </PublicAuthRoute>
    ),
  },
  {
    path: '/verify-email',
    errorElement: routeErrorElement,
    element: (
      <PublicAuthRoute>
        <VerifyEmailPage />
      </PublicAuthRoute>
    ),
  },
  {
    path: '/select-company',
    errorElement: routeErrorElement,
    element: (
      <ProtectedRoute requireCompany={false}>
        <CompanySelectPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/create-company',
    errorElement: routeErrorElement,
    element: (
      <ProtectedRoute requireCompany={false}>
        <CreateCompanyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/app/companies/new',
    errorElement: routeErrorElement,
    element: (
      <ProtectedRoute requireCompany={false}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CreateCompanyPage variant="embedded" />,
      },
    ],
  },
  {
    path: '/app',
    errorElement: routeErrorElement,
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
        element: (
          <ModuleGate moduleName="transfers">
            <TransactionsPage />
          </ModuleGate>
        ),
      },
      {
        path: 'transactions/search',
        element: (
          <ModuleGate moduleName="transfers">
            <TransactionSearchPage />
          </ModuleGate>
        ),
      },
      {
        path: 'transactions/new',
        element: (
          <ModuleGate moduleName="transfers">
            <CreateTransactionPage />
          </ModuleGate>
        ),
      },
      {
        path: 'transactions/:transactionCode',
        element: (
          <ModuleGate moduleName="transfers">
            <TransactionDetailsPage />
          </ModuleGate>
        ),
      },
      {
        path: 'collections',
        element: (
          <ModuleGate moduleName="correspondent_collections">
            <ModulePlaceholderPage
              description="Correspondent collection screens will be added in the next workflow pass."
              title="Collections"
            />
          </ModuleGate>
        ),
      },
      {
        path: 'account-operations',
        element: (
          <ModuleGate moduleName="account_operations">
            <ModulePlaceholderPage
              description="Withdrawal and account operation screens will be added next."
              title="Account Operations"
            />
          </ModuleGate>
        ),
      },
      {
        path: 'remote-agent-payout',
        element: (
          <ModuleGate moduleName="remote_agent_payout">
            <ModulePlaceholderPage
              description="Remote agent payout screens will be added in a later workflow pass."
              title="Remote Agent Payout"
            />
          </ModuleGate>
        ),
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
        element: (
          <ModuleGate moduleName="exchange_rate">
            <CompanyExchangeRatePage />
          </ModuleGate>
        ),
      },
      {
        path: 'company/cash',
        element: (
          <ModuleGate moduleName="company_cash">
            <CompanyCashPage />
          </ModuleGate>
        ),
      },
      {
        path: 'gold/dashboard',
        element: (
          <ModuleGate moduleName="gold_trading">
            <ModulePlaceholderPage title="Gold trading dashboard coming next" />
          </ModuleGate>
        ),
      },
      {
        path: 'gold/buy-operations',
        element: (
          <ModuleGate moduleName="gold_buy_operations">
            <ModulePlaceholderPage
              description="Gold buy operation screens will be added in a later phase."
              title="Buy Operations"
            />
          </ModuleGate>
        ),
      },
      {
        path: 'gold/sell-operations',
        element: (
          <ModuleGate moduleName="gold_sell_operations">
            <ModulePlaceholderPage
              description="Gold sell operation screens will be added in a later phase."
              title="Sell Operations"
            />
          </ModuleGate>
        ),
      },
      {
        path: 'gold/shipping',
        element: (
          <ModuleGate moduleName="gold_shipping">
            <ModulePlaceholderPage
              description="Gold shipping screens will be added in a later phase."
              title="Shipping"
            />
          </ModuleGate>
        ),
      },
      {
        path: 'gold/payments',
        element: (
          <ModuleGate moduleName="gold_trading">
            <ModulePlaceholderPage
              description="Gold payment screens will be added in a later phase."
              title="Gold Payments"
            />
          </ModuleGate>
        ),
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
