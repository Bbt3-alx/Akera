import { useId, useState } from 'react'
import { Link } from 'react-router-dom'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { AppApiError } from '../../../shared/api/types.ts'
import { useReverseTransaction } from '../hooks.ts'
import type {
  ReverseTransactionPayload,
  Transaction,
  TransactionCurrency,
} from '../types.ts'

const MAX_REASON_LENGTH = 300

type ReverseTransactionButtonProps = {
  transaction: Transaction
}

export function ReverseTransactionButton({
  transaction,
}: ReverseTransactionButtonProps) {
  const dialogTitleId = useId()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const { data: me, isLoading: isMeLoading } = useMe()
  const reverseTransaction = useReverseTransaction()
  const [isConfirming, setIsConfirming] = useState(false)
  const [transactionPin, setTransactionPin] = useState('')
  const [reason, setReason] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const activeMembership = me?.memberships.find(
    (membership) => membership.companyId === activeCompanyId,
  )
  const isCheckingAccess = Boolean(activeCompanyId) && isMeLoading
  const isManager = activeMembership?.role === 'manager'
  const partnerName = transaction.partner?.name || 'Unknown partner'
  const trimmedReason = reason.trim()
  const trimmedPin = transactionPin.trim()
  const remainingCharacters = MAX_REASON_LENGTH - reason.length
  const isReasonTooLong = reason.length > MAX_REASON_LENGTH
  const isPinMissing = trimmedPin.length === 0
  const shouldHideForRole =
    activeMembership !== undefined && activeMembership.role !== 'manager'
  const shouldHideForMissingMembership =
    !isMeLoading && activeCompanyId !== null && activeMembership === undefined

  if (transaction.status !== 'completed' && !successMessage) {
    return null
  }

  if (!successMessage) {
    if (!activeCompanyId || shouldHideForRole || shouldHideForMissingMembership) {
      return null
    }
  }

  function handleOpenConfirmation() {
    reverseTransaction.reset()
    setTransactionPin('')
    setReason('')
    setSuccessMessage(null)
    setIsConfirming(true)
  }

  function handleCancelConfirmation() {
    reverseTransaction.reset()
    setTransactionPin('')
    setIsConfirming(false)
  }

  function handleConfirm() {
    const payload: ReverseTransactionPayload = {
      transactionPin: trimmedPin,
    }

    if (trimmedReason) {
      payload.reason = trimmedReason
    }

    setSuccessMessage(null)

    reverseTransaction.mutate(
      {
        transactionCode: transaction.transactionCode,
        payload,
      },
      {
        onSuccess: () => {
          setIsConfirming(false)
          setReason('')
          setSuccessMessage('Transaction reversed')
        },
        onSettled: () => {
          setTransactionPin('')
        },
      },
    )
  }

  const isReversalPending = reverseTransaction.isPending
  const canReverse =
    isManager &&
    !isCheckingAccess &&
    !isReversalPending &&
    !isReasonTooLong &&
    !isPinMissing
  const errorMessage = reverseTransaction.isError
    ? getErrorMessage(reverseTransaction.error)
    : null

  return (
    <div className="space-y-2 text-left sm:text-right">
      {transaction.status === 'completed' && !successMessage ? (
        <button
          className="inline-flex h-9 items-center justify-center rounded border border-purple-300 px-3 text-sm font-medium text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isCheckingAccess || isReversalPending}
          onClick={handleOpenConfirmation}
          type="button"
        >
          {isCheckingAccess
            ? 'Checking access'
            : isReversalPending
              ? 'Reversing'
              : 'Reverse'}
        </button>
      ) : null}

      {isConfirming ? (
        <div
          aria-labelledby={dialogTitleId}
          className="rounded border border-purple-200 bg-purple-50 p-3 text-sm text-slate-700 shadow-sm sm:w-80 sm:text-left"
          role="dialog"
        >
          <h3
            className="text-sm font-semibold text-slate-950"
            id={dialogTitleId}
          >
            Confirm reversal
          </h3>
          <p className="mt-2 text-sm text-purple-900">
            Reversal is a sensitive financial action. Confirm the transaction
            details and enter your transaction PIN to continue.
          </p>
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
            Transaction PIN
            <input
              autoComplete="off"
              className="h-10 rounded border border-purple-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              inputMode="numeric"
              onChange={(event) => setTransactionPin(event.target.value)}
              type="password"
              value={transactionPin}
            />
          </label>

          <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-slate-700">
            Reason
            <textarea
              className="min-h-24 rounded border border-purple-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
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
              {isPinNotConfiguredError(reverseTransaction.error) && isManager ? (
                <>
                  {' '}
                  <Link
                    className="underline decoration-rose-400 underline-offset-2 hover:text-rose-900"
                    to="/app/security/transaction-pin"
                  >
                    Set transaction PIN
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isReversalPending}
              onClick={handleCancelConfirmation}
              type="button"
            >
              Keep transaction
            </button>
            <button
              className="h-9 rounded bg-purple-700 px-3 text-sm font-medium text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canReverse}
              onClick={handleConfirm}
              type="button"
            >
              {isReversalPending ? 'Reversing' : 'Confirm reverse'}
            </button>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800 sm:text-left">
          <p className="font-medium">{successMessage}</p>
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
  if (isPinNotConfiguredError(error)) {
    return 'Transaction PIN is not configured.'
  }

  return error instanceof Error
    ? error.message
    : 'Reversal failed. Try again or contact support.'
}

function isPinNotConfiguredError(error: unknown): boolean {
  return error instanceof AppApiError && error.errorCode === 'PIN_NOT_CONFIGURED'
}
