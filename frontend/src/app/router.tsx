import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RegisterPage } from '../features/auth/pages/RegisterPage.tsx'
import { LoginPage } from '../features/auth/pages/LoginPage.tsx'
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
    path: '/select-company',
    element: <CompanySelectPage />,
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
          <section>
            <h1 className="text-2xl font-semibold text-slate-950">
              App Placeholder
            </h1>
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
