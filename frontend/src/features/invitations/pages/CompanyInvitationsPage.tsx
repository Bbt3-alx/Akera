import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import {
  useForm,
  useWatch,
  type UseFormRegisterReturn,
} from 'react-hook-form'
import { z } from 'zod'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import {
  useCompanyInvitations,
  useCreateInvitation,
  useRevokeInvitation,
} from '../hooks.ts'
import type {
  CompanyInvitation,
  CreateInvitationPayload,
  InvitationCurrency,
} from '../types.ts'

const CURRENCIES = ['FCFA', 'GNF'] as const
const INVITATION_ROLES = ['partner', 'employee'] as const

const employeeInvitationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  role: z.literal('employee'),
  currency: z.enum(CURRENCIES).optional(),
  startingBalance: z
    .number({ error: 'Starting balance must be a number' })
    .min(0, 'Starting balance must be greater than or equal to 0')
    .optional(),
})

const partnerInvitationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  role: z.literal('partner'),
  currency: z.enum(CURRENCIES, {
    error: 'Currency is required for partner invitations',
  }),
  startingBalance: z
    .number({ error: 'Starting balance must be a number' })
    .min(0, 'Starting balance must be greater than or equal to 0')
    .optional(),
})

const createInvitationSchema = z.discriminatedUnion('role', [
  partnerInvitationSchema,
  employeeInvitationSchema,
])

type CreateInvitationFormValues = z.infer<typeof createInvitationSchema>

const DEFAULT_FORM_VALUES: CreateInvitationFormValues = {
  email: '',
  role: 'employee',
  currency: 'FCFA',
  startingBalance: 0,
}

export function CompanyInvitationsPage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const activeMembership = meQuery.data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const isManager = activeMembership?.role === 'manager'
  const invitationsQuery = useCompanyInvitations('pending', isManager)
  const createInvitationMutation = useCreateInvitation()
  const revokeInvitationMutation = useRevokeInvitation()
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateInvitationFormValues>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })
  const selectedRole = useWatch({ control, name: 'role' })
  const isCheckingAccess = Boolean(activeCompanyId) && meQuery.isLoading
  const pendingInvitations = invitationsQuery.data ?? []
  const createError = getErrorMessage(createInvitationMutation.error)
  const revokeError = getErrorMessage(revokeInvitationMutation.error)
  const isCreating = isSubmitting || createInvitationMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createInvitationMutation.mutateAsync(
        toCreateInvitationPayload(values),
      )
      reset(DEFAULT_FORM_VALUES)
    } catch {
      return
    }
  })

  async function handleRevokeInvitation(invitation: CompanyInvitation) {
    try {
      await revokeInvitationMutation.mutateAsync(invitation.id)
    } catch {
      return
    }
  }

  if (isCheckingAccess) {
    return (
      <StateMessage title="Checking access">
        Confirming your selected company membership.
      </StateMessage>
    )
  }

  if (meQuery.isError) {
    return (
      <StateMessage title="Unable to confirm access">
        {getErrorMessage(meQuery.error) ?? 'Refresh the page and try again.'}
      </StateMessage>
    )
  }

  if (!activeCompanyId) {
    return (
      <StateMessage title="No company selected">
        Select a company before managing invitations.
      </StateMessage>
    )
  }

  if (!isManager) {
    return (
      <StateMessage title="Only managers can manage invitations.">
        Your active company role cannot create or revoke invitations.
      </StateMessage>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          Company invitations
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Invite partners and employees into the active company workspace.
        </p>
      </div>

      <form
        className="rounded border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={onSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            error={errors.email?.message}
            label="Email"
            registration={register('email')}
            type="email"
          />

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="role"
            >
              Role
            </label>
            <select
              className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              id="role"
              {...register('role')}
            >
              {INVITATION_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.role.message}
              </p>
            ) : null}
          </div>

          {selectedRole === 'partner' ? (
            <>
              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="currency"
                >
                  Currency
                </label>
                <select
                  className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  id="currency"
                  {...register('currency')}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                {errors.currency ? (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.currency.message}
                  </p>
                ) : null}
              </div>

              <FormField
                error={errors.startingBalance?.message}
                label="Starting balance"
                registration={register('startingBalance', {
                  setValueAs: toOptionalNumber,
                })}
                type="number"
              />
            </>
          ) : null}
        </div>

        {createError ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {createError}
          </p>
        ) : null}

        <button
          className="mt-6 h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isCreating}
          type="submit"
        >
          {isCreating ? 'Sending invitation' : 'Send invitation'}
        </button>
      </form>

      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-950">
            Pending invitations
          </h2>
        </div>

        {revokeError ? (
          <p className="m-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {revokeError}
          </p>
        ) : null}

        {invitationsQuery.isLoading ? (
          <TableState title="Loading invitations">
            Fetching pending invitations for this company.
          </TableState>
        ) : null}

        {invitationsQuery.isError ? (
          <TableState title="Unable to load invitations">
            {getErrorMessage(invitationsQuery.error) ??
              'Check your connection and try again.'}
          </TableState>
        ) : null}

        {!invitationsQuery.isLoading &&
        !invitationsQuery.isError &&
        pendingInvitations.length === 0 ? (
          <TableState title="No pending invitations">
            Created invitations will appear here until they are accepted,
            rejected, revoked, or expired.
          </TableState>
        ) : null}

        {!invitationsQuery.isLoading &&
        !invitationsQuery.isError &&
        pendingInvitations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Starting balance</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendingInvitations.map((invitation) => {
                  const isRevoking =
                    revokeInvitationMutation.isPending &&
                    revokeInvitationMutation.variables === invitation.id

                  return (
                    <tr key={invitation.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                        {invitation.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-700">
                        {invitation.role}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {invitation.currency ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {invitation.role === 'partner'
                          ? formatAmount(
                              invitation.startingBalance ?? 0,
                              invitation.currency,
                            )
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(invitation.expiresAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          className="inline-flex h-8 items-center rounded border border-red-200 px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={revokeInvitationMutation.isPending}
                          onClick={() =>
                            void handleRevokeInvitation(invitation)
                          }
                          type="button"
                        >
                          {isRevoking ? 'Revoking' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  )
}

type FormFieldProps = {
  error?: string
  label: string
  registration: UseFormRegisterReturn
  type?: 'email' | 'number' | 'text'
}

function FormField({
  error,
  label,
  registration,
  type = 'text',
}: FormFieldProps) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        type={type}
        {...registration}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

type StateMessageProps = {
  children: ReactNode
  title: string
}

function StateMessage({ children, title }: StateMessageProps) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
      <h1 className="text-sm font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function TableState({ children, title }: StateMessageProps) {
  return (
    <div className="px-4 py-12 text-center">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function toCreateInvitationPayload(
  values: CreateInvitationFormValues,
): CreateInvitationPayload {
  const email = values.email.trim()

  if (values.role === 'employee') {
    return {
      email,
      role: values.role,
    }
  }

  return {
    email,
    role: values.role,
    currency: values.currency,
    startingBalance: values.startingBalance ?? 0,
  }
}

function toOptionalNumber(value: unknown) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined
  }

  return Number(value)
}

function formatAmount(amount: number, currency?: InvitationCurrency) {
  const formattedAmount = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(amount)

  return currency ? `${formattedAmount} ${currency}` : formattedAmount
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Please try again.'
}
