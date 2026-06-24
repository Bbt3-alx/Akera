import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { useSetupTransactionPin } from '../hooks.ts'
import { setupTransactionPinSchema } from '../viewModel.ts'

type SetupTransactionPinFormValues = z.infer<
  typeof setupTransactionPinSchema
>

type TransactionPinSetupCardProps = {
  onCancel?: () => void
  onConfigured?: () => void
}

export function TransactionPinSetupCard({
  onCancel,
  onConfigured,
}: TransactionPinSetupCardProps) {
  const setupTransactionPin = useSetupTransactionPin()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<SetupTransactionPinFormValues>({
    resolver: zodResolver(setupTransactionPinSchema),
    defaultValues: {
      currentPassword: '',
      transactionPin: '',
      confirmTransactionPin: '',
    },
  })
  const isSaving = isSubmitting || setupTransactionPin.isPending

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)
    setupTransactionPin.reset()

    try {
      await setupTransactionPin.mutateAsync({
        currentPassword: values.currentPassword,
        transactionPin: values.transactionPin,
      })
      setSuccessMessage('PIN de transaction configuré.')
      onConfigured?.()
    } catch {
      return
    } finally {
      reset({
        currentPassword: '',
        transactionPin: '',
        confirmTransactionPin: '',
      })
    }
  })

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Configurer mon PIN
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Créez un PIN à 6 chiffres pour autoriser vos actions sensibles.
          </p>
        </div>
        {onCancel ? (
          <button
            className="h-8 rounded border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={onCancel}
            type="button"
          >
            Fermer
          </button>
        ) : null}
      </div>

      <form className="mt-4 max-w-xl space-y-4" onSubmit={onSubmit}>
        <PasswordField
          error={errors.currentPassword?.message}
          label="Mot de passe actuel"
          registration={register('currentPassword')}
        />
        <PinField
          error={errors.transactionPin?.message}
          label="PIN de transaction"
          registration={register('transactionPin')}
        />
        <PinField
          error={errors.confirmTransactionPin?.message}
          label="Confirmer le PIN"
          registration={register('confirmTransactionPin')}
        />
        <FormMessage error={setupTransactionPin.error} success={successMessage} />
        <button
          className="h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Configuration' : 'Configurer mon PIN'}
        </button>
      </form>
    </section>
  )
}

type FormFieldProps = {
  error?: string
  label: string
  registration: UseFormRegisterReturn
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
  type?: 'password' | 'text'
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

function FormMessage({
  error,
  success,
}: {
  error?: unknown
  success?: string | null
}) {
  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {getErrorMessage(error)}
      </p>
    )
  }

  if (success) {
    return (
      <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {success}
      </p>
    )
  }

  return null
}

function getErrorMessage(error: unknown): ReactNode {
  return error instanceof Error ? error.message : 'Réessayez.'
}
