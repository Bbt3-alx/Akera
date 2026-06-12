import { useId, useState } from 'react'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useCancelTransaction } from '../hooks.ts'
import type { Transaction, TransactionCurrency } from '../types.ts'

const MAX_REASON_LENGTH = 300

type CancelTransactionButtonProps = {
  transaction: Transaction
}

export function CancelTransactionButton({
  transaction,
}: CancelTransactionButtonProps) {
  const dialogTitleId = useId()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const { data: me, isLoading: isMeLoading } = useMe()
  const cancelTransaction = useCancelTransaction()
  const [isConfirming, setIsConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [successReason, setSuccessReason] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const activeMembership = me?.memberships.find(
    (membership) => membership.companyId === activeCompanyId,
  )
  const isCheckingAccess = Boolean(activeCompanyId) && isMeLoading
  const isManager = activeMembership?.role === 'manager'
  const partnerName = transaction.partner?.name || 'Unknown partner'
  const trimmedReason = reason.trim()
  const remainingCharacters = MAX_REASON_LENGTH - reason.length
  const isReasonTooLong = reason.length > MAX_REASON_LENGTH
  const shouldHideForRole =
    activeMembership !== undefined && activeMembership.role !== 'manager'
  const shouldHideForMissingMembership =
    !isMeLoading && activeCompanyId !== null && activeMembership === undefined

  if (transaction.status !== 'pending' && !successMessage) {
    return null
  }

  if (!successMessage) {
    if (!activeCompanyId || shouldHideForRole || shouldHideForMissingMembership) {
      return null
    }
  }

  function handleOpenConfirmation() {
    cancelTransaction.reset()
    setReason('')
    setSuccessReason(null)
    setSuccessMessage(null)
    setIsConfirming(true)
  }

  function handleCancelConfirmation() {
    cancelTransaction.reset()
    setIsConfirming(false)
  }

  function handleConfirm() {
    const payload = trimmedReason ? { reason: trimmedReason } : undefined

    setSuccessMessage(null)
    setSuccessReason(null)

    cancelTransaction.mutate(
      {
        transactionCode: transaction.transactionCode,
        payload,
      },
      {
        onSuccess: () => {
          setIsConfirming(false)
          setSuccessReason(trimmedReason || null)
          setSuccessMessage('Transaction canceled')
        },
      },
    )
  }

  const isCancellationPending = cancelTransaction.isPending
  const canCancel =
    isManager &&
    !isCheckingAccess &&
    !isCancellationPending &&
    !isReasonTooLong
  const errorMessage = cancelTransaction.isError
    ? getErrorMessage(cancelTransaction.error)
    : null

  return (
    <div className="space-y-2 text-left sm:text-right">
      {transaction.status === 'pending' && !successMessage ? (
        <button
          className="inline-flex h-9 items-center justify-center rounded border border-rose-300 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canCancel}
          onClick={handleOpenConfirmation}
          type="button"
        >
          {isCheckingAccess
            ? 'Checking access'
            : isCancellationPending
              ? 'Canceling'
              : 'Cancel'}
        </button>
      ) : null}

      {isConfirming ? (
        <div
          aria-labelledby={dialogTitleId}
          className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-slate-700 shadow-sm sm:w-80 sm:text-left"
          role="dialog"
        >
          <h3
            className="text-sm font-semibold text-slate-950"
            id={dialogTitleId}
          >
            Confirm cancellation
          </h3>
          <dl className="mt-3 space-y-2">
            <ConfirmDetail label="Code" value={transaction.transactionCode} />
            <ConfirmDetail label="Partner" value={partnerName} />
            <ConfirmDetail
              label="Beneficiary"
              value={transaction.beneficiaryName}
            />
            <ConfirmDetail
              label="Amount"
              value={formatAmount(
                transaction.companyAmount,
                transaction.companyCurrency,
              )}
            />
          </dl>

          <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-slate-700">
            Reason
            <textarea
              className="min-h-24 rounded border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              maxLength={MAX_REASON_LENGTH}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional"
              value={reason}
            />
          </label>
          <p
            className={[
              'mt-1 text-xs',
              isReasonTooLong ? 'text-rose-700' : 'text-slate-500',
            ].join(' ')}
          >
            {Math.max(remainingCharacters, 0)} characters remaining
          </p>

          {errorMessage ? (
            <p className="mt-3 rounded border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCancellationPending}
              onClick={handleCancelConfirmation}
              type="button"
            >
              Keep transaction
            </button>
            <button
              className="h-9 rounded bg-rose-700 px-3 text-sm font-medium text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canCancel}
              onClick={handleConfirm}
              type="button"
            >
              {isCancellationPending ? 'Canceling' : 'Confirm cancel'}
            </button>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:text-left">
          <p className="font-medium">{successMessage}</p>
          {successReason ? <p className="mt-1">Reason: {successReason}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

type ConfirmDetailProps = {
  label: string
  value: string
}

function ConfirmDetail({ label, value }: ConfirmDetailProps) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words text-right font-medium text-slate-950">
        {value}
      </dd>
    </div>
  )
}

function formatAmount(amount: number, currency: TransactionCurrency) {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Cancellation failed. Try again or contact support.'
}
