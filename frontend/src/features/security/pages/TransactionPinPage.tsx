import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import {
  useChangeTransactionPin,
  useSetupTransactionPin,
  useTransactionPinStatus,
} from '../hooks.ts'

const PIN_PATTERN = /^\d{6}$/

const setupTransactionPinSchema = z
  .object({
    transactionPin: z
      .string()
      .regex(PIN_PATTERN, 'Transaction PIN must contain exactly 6 digits'),
    confirmTransactionPin: z.string(),
    currentPassword: z.string().min(1, 'Current password is required'),
  })
  .refine((values) => values.transactionPin === values.confirmTransactionPin, {
    message: 'PIN confirmation must match',
    path: ['confirmTransactionPin'],
  })

const changeTransactionPinSchema = z
  .object({
    currentTransactionPin: z
      .string()
      .regex(PIN_PATTERN, 'Current PIN must contain exactly 6 digits'),
    newTransactionPin: z
      .string()
      .regex(PIN_PATTERN, 'New PIN must contain exactly 6 digits'),
    confirmNewTransactionPin: z.string(),
    currentPassword: z.string().min(1, 'Current password is required'),
  })
  .refine(
    (values) => values.newTransactionPin === values.confirmNewTransactionPin,
    {
      message: 'PIN confirmation must match',
      path: ['confirmNewTransactionPin'],
    },
  )

type SetupTransactionPinFormValues = z.infer<
  typeof setupTransactionPinSchema
>

type ChangeTransactionPinFormValues = z.infer<
  typeof changeTransactionPinSchema
>

export function TransactionPinPage() {
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const activeMembership = meQuery.data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const isManager = activeMembership?.role === 'manager'
  const transactionPinStatusQuery = useTransactionPinStatus(isManager)
  const isCheckingAccess = Boolean(activeCompanyId) && meQuery.isLoading

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
        Select a company before configuring a transaction PIN.
      </StateMessage>
    )
  }

  if (!isManager) {
    return (
      <StateMessage title="Only managers can configure a transaction PIN.">
        Your active company role cannot manage transaction PIN settings.
      </StateMessage>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          Transaction PIN
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Configure the PIN required before reversing completed transactions.
        </p>
      </div>

      {successMessage ? (
        <p className="max-w-xl rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {transactionPinStatusQuery.isLoading ? (
        <StateMessage title="Loading transaction PIN status">
          Checking whether your PIN is configured.
        </StateMessage>
      ) : null}

      {transactionPinStatusQuery.isError ? (
        <StateMessage title="Unable to load transaction PIN status">
          {getErrorMessage(transactionPinStatusQuery.error) ??
            'Check your connection and try again.'}
        </StateMessage>
      ) : null}

      {!transactionPinStatusQuery.isLoading &&
      !transactionPinStatusQuery.isError ? (
        transactionPinStatusQuery.data?.configured ? (
          <ChangeTransactionPinForm onSuccess={setSuccessMessage} />
        ) : (
          <SetupTransactionPinForm onSuccess={setSuccessMessage} />
        )
      ) : null}
    </section>
  )
}

type TransactionPinFormProps = {
  onSuccess: (message: string) => void
}

function SetupTransactionPinForm({ onSuccess }: TransactionPinFormProps) {
  const setupTransactionPin = useSetupTransactionPin()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<SetupTransactionPinFormValues>({
    resolver: zodResolver(setupTransactionPinSchema),
    defaultValues: {
      transactionPin: '',
      confirmTransactionPin: '',
      currentPassword: '',
    },
  })
  const isSaving = isSubmitting || setupTransactionPin.isPending
  const errorMessage = getErrorMessage(setupTransactionPin.error)

  const onSubmit = handleSubmit(async (values) => {
    onSuccess('')
    setupTransactionPin.reset()

    try {
      await setupTransactionPin.mutateAsync({
        transactionPin: values.transactionPin,
        currentPassword: values.currentPassword,
      })
      onSuccess('Transaction PIN configured.')
    } catch {
      return
    } finally {
      reset({
        transactionPin: '',
        confirmTransactionPin: '',
        currentPassword: '',
      })
    }
  })

  return (
    <TransactionPinFormCard
      description="Create a 6-digit PIN for sensitive transaction actions."
      title="Set transaction PIN"
    >
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <PinField
          error={errors.transactionPin?.message}
          label="Transaction PIN"
          registration={register('transactionPin')}
        />
        <PinField
          error={errors.confirmTransactionPin?.message}
          label="Confirm transaction PIN"
          registration={register('confirmTransactionPin')}
        />
        <PasswordField
          error={errors.currentPassword?.message}
          label="Current password"
          registration={register('currentPassword')}
        />

        <FormErrorMessage errorMessage={errorMessage} />

        <SubmitButton disabled={isSaving}>
          {isSaving ? 'Configuring PIN' : 'Configure PIN'}
        </SubmitButton>
      </form>
    </TransactionPinFormCard>
  )
}

function ChangeTransactionPinForm({ onSuccess }: TransactionPinFormProps) {
  const changeTransactionPin = useChangeTransactionPin()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ChangeTransactionPinFormValues>({
    resolver: zodResolver(changeTransactionPinSchema),
    defaultValues: {
      currentTransactionPin: '',
      newTransactionPin: '',
      confirmNewTransactionPin: '',
      currentPassword: '',
    },
  })
  const isSaving = isSubmitting || changeTransactionPin.isPending
  const errorMessage = getErrorMessage(changeTransactionPin.error)

  const onSubmit = handleSubmit(async (values) => {
    onSuccess('')
    changeTransactionPin.reset()

    try {
      await changeTransactionPin.mutateAsync({
        currentTransactionPin: values.currentTransactionPin,
        newTransactionPin: values.newTransactionPin,
        currentPassword: values.currentPassword,
      })
      onSuccess('Transaction PIN changed.')
    } catch {
      return
    } finally {
      reset({
        currentTransactionPin: '',
        newTransactionPin: '',
        confirmNewTransactionPin: '',
        currentPassword: '',
      })
    }
  })

  return (
    <TransactionPinFormCard
      description="Change the PIN used to authorize transaction reversals."
      title="Change transaction PIN"
    >
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <PinField
          error={errors.currentTransactionPin?.message}
          label="Current transaction PIN"
          registration={register('currentTransactionPin')}
        />
        <PinField
          error={errors.newTransactionPin?.message}
          label="New transaction PIN"
          registration={register('newTransactionPin')}
        />
        <PinField
          error={errors.confirmNewTransactionPin?.message}
          label="Confirm new transaction PIN"
          registration={register('confirmNewTransactionPin')}
        />
        <PasswordField
          error={errors.currentPassword?.message}
          label="Current password"
          registration={register('currentPassword')}
        />

        <FormErrorMessage errorMessage={errorMessage} />

        <SubmitButton disabled={isSaving}>
          {isSaving ? 'Changing PIN' : 'Change PIN'}
        </SubmitButton>
      </form>
    </TransactionPinFormCard>
  )
}

type TransactionPinFormCardProps = {
  children: ReactNode
  description: string
  title: string
}

function TransactionPinFormCard({
  children,
  description,
  title,
}: TransactionPinFormCardProps) {
  return (
    <div className="max-w-xl rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {children}
    </div>
  )
}

type FormFieldProps = {
  error?: string
  label: string
  registration: UseFormRegisterReturn
  type?: 'password' | 'text'
}

function PinField({ error, label, registration }: FormFieldProps) {
  return (
    <FormField
      autoComplete="off"
      error={error}
      inputMode="numeric"
      label={label}
      registration={registration}
      type="password"
    />
  )
}

function PasswordField({ error, label, registration }: FormFieldProps) {
  return (
    <FormField
      autoComplete="current-password"
      error={error}
      label={label}
      registration={registration}
      type="password"
    />
  )
}

type SharedFormFieldProps = FormFieldProps & {
  autoComplete?: string
  inputMode?: 'numeric'
}

function FormField({
  autoComplete,
  error,
  inputMode,
  label,
  registration,
  type = 'text',
}: SharedFormFieldProps) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        inputMode={inputMode}
        type={type}
        {...registration}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

type FormErrorMessageProps = {
  errorMessage: string | null
}

function FormErrorMessage({ errorMessage }: FormErrorMessageProps) {
  return errorMessage ? (
    <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {errorMessage}
    </p>
  ) : null
}

type SubmitButtonProps = {
  children: ReactNode
  disabled: boolean
}

function SubmitButton({ children, disabled }: SubmitButtonProps) {
  return (
    <button
      className="h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
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

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Please try again.'
}
