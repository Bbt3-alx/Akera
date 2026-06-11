import { useId, useState } from 'react'

import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { usePayTransaction } from '../hooks.ts'
import type { Transaction, TransactionCurrency } from '../types.ts'

type PayTransactionButtonProps = {
  transaction: Transaction
}

export function PayTransactionButton({ transaction }: PayTransactionButtonProps) {
  const dialogTitleId = useId()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const { data: me, isLoading: isMeLoading } = useMe()
  const payTransaction = usePayTransaction()
  const [isConfirming, setIsConfirming] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const activeMembership = me?.memberships.find(
    (membership) => membership.companyId === activeCompanyId,
  )
  const isCheckingAccess = Boolean(activeCompanyId) && isMeLoading
  const isManager = activeMembership?.role === 'manager'
  const partnerName = transaction.partner?.name || 'Unknown partner'
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
    payTransaction.reset()
    setSuccessMessage(null)
    setIsConfirming(true)
  }

  function handleCancel() {
    payTransaction.reset()
    setIsConfirming(false)
  }

  function handleConfirm() {
    setSuccessMessage(null)

    payTransaction.mutate(transaction.transactionCode, {
      onSuccess: (response) => {
        const receiptText = response.receipt?.receiptNumber
          ? ` Receipt ${response.receipt.receiptNumber} generated.`
          : ''

        setIsConfirming(false)
        setSuccessMessage(`Payment completed.${receiptText}`)
      },
    })
  }

  const isPaymentPending = payTransaction.isPending
  const canPay = isManager && !isCheckingAccess && !isPaymentPending
  const errorMessage = payTransaction.isError
    ? getErrorMessage(payTransaction.error)
    : null

  return (
    <div className="space-y-2 text-left sm:text-right">
      {transaction.status === 'pending' ? (
        <button
          className="inline-flex h-9 items-center justify-center rounded bg-emerald-700 px-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canPay}
          onClick={handleOpenConfirmation}
          type="button"
        >
          {isCheckingAccess
            ? 'Checking access'
            : isPaymentPending
              ? 'Paying'
              : 'Pay'}
        </button>
      ) : null}

      {isConfirming ? (
        <div
          aria-labelledby={dialogTitleId}
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700 shadow-sm sm:w-80 sm:text-left"
          role="dialog"
        >
          <h3
            className="text-sm font-semibold text-slate-950"
            id={dialogTitleId}
          >
            Confirm payment
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

          {errorMessage ? (
            <p className="mt-3 rounded border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPaymentPending}
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-9 rounded bg-emerald-700 px-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canPay}
              onClick={handleConfirm}
              type="button"
            >
              {isPaymentPending ? 'Paying' : 'Confirm payment'}
            </button>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 sm:text-left">
          {successMessage}
        </p>
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
    : 'Payment failed. Try again or contact support.'
}
