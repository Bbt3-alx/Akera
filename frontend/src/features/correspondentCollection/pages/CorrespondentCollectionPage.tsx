import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

import { createIdempotencyKey } from '../../../shared/utils/idempotency.ts'
import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import { useCurrentExchangeRate } from '../../exchangeRates/hooks.ts'
import { TransactionPinSetupCard } from '../../security/components/TransactionPinSetupCard.tsx'
import { useTransactionPinStatus } from '../../security/hooks.ts'
import { getTransactionPinRequiredContent } from '../../security/viewModel.ts'
import {
  useApproveCorrespondentModificationRequest,
  useCancelCorrespondentTransaction,
  useCancelCorrespondentWithdrawal,
  useCancelCorrespondentWithdrawalById,
  useConfirmCorrespondentWithdrawal,
  useConfirmCorrespondentWithdrawalById,
  useCorrespondentModificationRequests,
  useCorrespondentTransaction,
  useCorrespondentTransactions,
  useCorrespondentWithdrawals,
  useCorrespondents,
  useCreateCorrespondentTransaction,
  useCreateCorrespondentWithdrawal,
  usePayCorrespondentTransactionByCode,
  usePayCorrespondentTransactionById,
  useCancelCorrespondentTransactionById,
  useRejectCorrespondentModificationRequest,
  useRequestCorrespondentTransactionModification,
  useRequestCorrespondentWithdrawalModification,
} from '../hooks.ts'
import type {
  CorrespondentModificationRequest,
  CorrespondentSummary,
  CorrespondentTransaction,
  CorrespondentWithdrawal,
} from '../types.ts'
import {
  CORRESPONDENT_MANAGER_TABS,
  CORRESPONDENT_PARTNER_TABS,
  CORRESPONDENT_AMOUNT_INTEGER_MESSAGE,
  CORRESPONDENT_GNF_ONLY_MESSAGE,
  CORRESPONDENT_RATE_MISSING_MESSAGE,
  CORRESPONDENT_UI_TEXT,
  buildCorrespondentOverview,
  calculateCorrespondentTransactionPreview,
  formatCorrespondentAmount,
  formatCorrespondentRate,
  getAutoSelectedCorrespondentId,
  getCorrespondentById,
  getCorrespondentErrorMessage,
  getCorrespondentVisibleIdentity,
  getTransactionStatusLabel,
  getTransactionStatusMessage,
  getWithdrawalStatusLabel,
  getWithdrawalWarning,
  parseCorrespondentAmountInput,
  resolveCorrespondentTab,
  type CorrespondentTab,
} from '../viewModel.ts'

const LIST_PARAMS = { page: 1, limit: 50 } as const
const EMPTY_CORRESPONDENTS: CorrespondentSummary[] = []
const EMPTY_TRANSACTIONS: CorrespondentTransaction[] = []
const EMPTY_WITHDRAWALS: CorrespondentWithdrawal[] = []
const EMPTY_MODIFICATION_REQUESTS: CorrespondentModificationRequest[] = []

export function CorrespondentCollectionPage() {
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const activeMembership = meQuery.data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const isManager = activeMembership?.role === 'manager'
  const isPartner = activeMembership?.role === 'partner'
  const requestedTab = searchParams.get('tab')
  const activeTab = resolveCorrespondentTab(activeMembership?.role, requestedTab)
  const correspondentsQuery = useCorrespondents(
    undefined,
    Boolean(isManager || isPartner),
  )
  const transactionsQuery = useCorrespondentTransactions(
    LIST_PARAMS,
    Boolean(isManager || isPartner),
  )
  const withdrawalsQuery = useCorrespondentWithdrawals(
    LIST_PARAMS,
    Boolean(isManager || isPartner),
  )
  const modificationRequestsQuery = useCorrespondentModificationRequests(
    LIST_PARAMS,
    Boolean(isManager || isPartner),
  )
  const transactionPinStatusQuery = useTransactionPinStatus(
    Boolean(isManager || isPartner),
  )
  const exchangeRateQuery = useCurrentExchangeRate(Boolean(isPartner))
  const correspondents = correspondentsQuery.data ?? EMPTY_CORRESPONDENTS
  const transactions = transactionsQuery.data?.data ?? EMPTY_TRANSACTIONS
  const withdrawals = withdrawalsQuery.data?.data ?? EMPTY_WITHDRAWALS
  const modificationRequests =
    modificationRequestsQuery.data?.data ?? EMPTY_MODIFICATION_REQUESTS
  const overview = useMemo(
    () =>
      buildCorrespondentOverview({
        correspondents,
        transactions,
        withdrawals,
      }),
    [correspondents, transactions, withdrawals],
  )
  const isLoading =
    meQuery.isLoading ||
    correspondentsQuery.isLoading ||
    transactionsQuery.isLoading ||
    withdrawalsQuery.isLoading ||
    modificationRequestsQuery.isLoading ||
    transactionPinStatusQuery.isLoading

  const handleTabChange = (tab: CorrespondentTab) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', tab)
    setSearchParams(nextSearchParams)
  }

  if (meQuery.isLoading) {
    return <StateMessage title="Chargement">Préparation du module.</StateMessage>
  }

  if (!isManager && !isPartner) {
    return (
      <StateMessage title="Accès indisponible">
        Ce module est réservé aux gestionnaires et aux correspondants actifs.
      </StateMessage>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-slate-500">
          {CORRESPONDENT_UI_TEXT.navLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
          {CORRESPONDENT_UI_TEXT.pageTitle}
        </h1>
      </header>

      <TabList
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={isManager ? CORRESPONDENT_MANAGER_TABS : CORRESPONDENT_PARTNER_TABS}
      />

      {isLoading ? (
        <StateMessage title="Chargement">Données en cours de chargement.</StateMessage>
      ) : null}
      <QueryErrors
        errors={[
          correspondentsQuery.error,
          transactionsQuery.error,
          withdrawalsQuery.error,
          modificationRequestsQuery.error,
          transactionPinStatusQuery.error,
        ]}
      />

      {isManager && activeTab === 'overview' ? (
        <OverviewSection overview={overview} />
      ) : null}
      {isManager && activeTab === 'pay-by-code' ? <PayByCodeSection /> : null}
      {isManager && activeTab === 'transactions' ? (
        <TransactionsSection transactions={transactions} />
      ) : null}
      {isManager && activeTab === 'create-withdrawal' ? (
        <CreateWithdrawalSection correspondents={correspondents} />
      ) : null}
      {isManager && activeTab === 'withdrawals' ? (
        <WithdrawalsSection
          correspondents={correspondents}
          isManager={isManager}
          withdrawals={withdrawals}
        />
      ) : null}
      {isManager && activeTab === 'modification-requests' ? (
        <ModificationRequestsSection
          isManager={isManager}
          requests={modificationRequests}
        />
      ) : null}

      {isPartner && activeTab === 'create-transaction' ? (
        <CreateTransactionSection
          correspondents={correspondents}
          exchangeRate={exchangeRateQuery.data ?? null}
          isExchangeRateLoading={exchangeRateQuery.isLoading}
          isPinSetupOpen={isPinSetupOpen}
          onClosePinSetup={() => setIsPinSetupOpen(false)}
          onOpenPinSetup={() => setIsPinSetupOpen(true)}
          onPinConfigured={() => {
            setIsPinSetupOpen(false)
            void transactionPinStatusQuery.refetch()
          }}
          pinConfigured={transactionPinStatusQuery.data?.configured ?? false}
        />
      ) : null}
      {isPartner && activeTab === 'my-transactions' ? (
        <TransactionsSection transactions={transactions} />
      ) : null}
      {isPartner && activeTab === 'my-withdrawals' ? (
        <WithdrawalsSection
          correspondents={correspondents}
          isManager={false}
          withdrawals={withdrawals}
        />
      ) : null}
      {isPartner && activeTab === 'modification-requests' ? (
        <ModificationRequestsSection
          isManager={false}
          requests={modificationRequests}
        />
      ) : null}
    </div>
  )
}

function OverviewSection({ overview }: { overview: ReturnType<typeof buildCorrespondentOverview> }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <MetricCard label="Transactions en attente" value={overview.pendingTransactionCount} />
      <MetricCard label="Transactions payées" value={overview.paidTransactionCount} />
      <MetricCard label="Retraits en attente" value={overview.pendingWithdrawalCount} />
      <MetricCard label="Retraits confirmés" value={overview.confirmedWithdrawalCount} />
      {overview.heldBalances.map((balance) => (
        <MetricCard
          key={balance.currency}
          label={`Fonds détenus ${balance.currency}`}
          value={formatCorrespondentAmount(balance.balance, balance.currency)}
        />
      ))}
      {overview.heldBalances.map((balance) => (
        <MetricCard
          key={`${balance.currency}-reserved`}
          label={`Solde réservé ${balance.currency}`}
          value={formatCorrespondentAmount(
            balance.reservedBalance,
            balance.currency,
          )}
        />
      ))}
    </section>
  )
}

function CreateTransactionSection({
  correspondents,
  exchangeRate,
  isExchangeRateLoading,
  isPinSetupOpen,
  onClosePinSetup,
  onOpenPinSetup,
  onPinConfigured,
  pinConfigured,
}: {
  correspondents: CorrespondentSummary[]
  exchangeRate: { rate: number } | null
  isExchangeRateLoading: boolean
  isPinSetupOpen: boolean
  onClosePinSetup: () => void
  onOpenPinSetup: () => void
  onPinConfigured: () => void
  pinConfigured: boolean
}) {
  const createTransaction = useCreateCorrespondentTransaction()
  const [form, setForm] = useState({
    amount: '',
    beneficiaryName: '',
    beneficiaryPhone: '',
    inputCurrency: 'GNF' as 'FCFA' | 'GNF',
    inputSide: 'account' as 'account' | 'company',
    note: '',
    transactionPin: '',
  })
  const [result, setResult] = useState<CorrespondentTransaction | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const selectedCorrespondentId = getAutoSelectedCorrespondentId({
    correspondents,
    selectedCorrespondentId: correspondents[0]?.membershipId,
  })
  const correspondent = getCorrespondentById(correspondents, selectedCorrespondentId)
  const accountCurrency = correspondent?.currency ?? 'GNF'
  const parsedAmount = parseCorrespondentAmountInput(form.amount)
  const transactionPreview = calculateCorrespondentTransactionPreview({
    inputAmount: parsedAmount.amount,
    inputCurrency: form.inputCurrency,
    inputSide: form.inputSide,
    rateValue: exchangeRate?.rate,
  })
  const rateMissing = !isExchangeRateLoading && !exchangeRate
  const isSaving = createTransaction.isPending
  const pinRequiredContent = getTransactionPinRequiredContent()

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    createTransaction.reset()

    if (rateMissing) {
      setFormError(CORRESPONDENT_RATE_MISSING_MESSAGE)
      return
    }

    if (parsedAmount.error || !parsedAmount.amount) {
      setFormError(parsedAmount.error)
      return
    }

    try {
      const transaction = await createTransaction.mutateAsync({
        amount: parsedAmount.amount,
        beneficiaryName: form.beneficiaryName.trim(),
        beneficiaryPhone: optionalString(form.beneficiaryPhone),
        correspondentMembershipId: selectedCorrespondentId || undefined,
        inputAmount: parsedAmount.amount,
        inputCurrency: form.inputCurrency,
        inputSide: form.inputSide,
        idempotencyKey: createIdempotencyKey('correspondent-transaction'),
        note: optionalString(form.note),
        transactionPin: form.transactionPin,
      })
      setResult(transaction)
      setForm({
        amount: '',
        beneficiaryName: '',
        beneficiaryPhone: '',
        inputCurrency: accountCurrency,
        inputSide: 'account',
        note: '',
        transactionPin: '',
      })
    } catch {
      setForm((current) => ({ ...current, transactionPin: '' }))
    }
  }

  return (
    <section className="space-y-4">
      <PanelTitle>{CORRESPONDENT_UI_TEXT.createTransaction}</PanelTitle>
      {!pinConfigured ? (
        <>
          <TransactionPinRequiredCard
            actionLabel={pinRequiredContent.actionLabel}
            description={pinRequiredContent.description}
            onConfigure={onOpenPinSetup}
            title={pinRequiredContent.title}
          />
          {isPinSetupOpen ? (
            <TransactionPinSetupCard
              onCancel={onClosePinSetup}
              onConfigured={onPinConfigured}
            />
          ) : null}
        </>
      ) : null}
      {result ? <TransactionSuccessCard transaction={result} /> : null}
      {pinConfigured ? (
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <FieldSlot column="primary" desktopClassName="md:col-start-1 md:row-start-1">
          <TextField
            label="Nom bénéficiaire"
            onChange={(value) => setForm((current) => ({ ...current, beneficiaryName: value }))}
            required
            value={form.beneficiaryName}
          />
        </FieldSlot>
        <FieldSlot column="secondary" desktopClassName="md:col-start-2 md:row-start-2">
          <TextField
            label="Téléphone bénéficiaire"
            onChange={(value) => setForm((current) => ({ ...current, beneficiaryPhone: value }))}
            value={form.beneficiaryPhone}
          />
        </FieldSlot>
        <FieldSlot column="primary" desktopClassName="md:col-start-1 md:row-start-2">
          <TextField
            inputMode="numeric"
            label="Montant saisi"
            onChange={(value) => setForm((current) => ({ ...current, amount: value }))}
            required
            value={form.amount}
          />
        </FieldSlot>
        <FieldSlot column="secondary" desktopClassName="md:col-start-2 md:row-start-1">
          <SegmentedChoice
            label="Montant saisi comme"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                inputSide: value as 'account' | 'company',
              }))
            }
            options={[
              { label: 'Devise compte', value: 'account' },
              { label: 'Devise entreprise', value: 'company' },
            ]}
            value={form.inputSide}
          />
        </FieldSlot>
        <FieldSlot column="primary" desktopClassName="md:col-start-1 md:row-start-3">
          <ReadOnlyField
            label="Aperçu de conversion"
            value={
              transactionPreview
                ? `${formatCorrespondentAmount(
                    transactionPreview.amount,
                    transactionPreview.currency,
                  )} détenus · ${formatCorrespondentAmount(
                    transactionPreview.payoutAmount,
                    transactionPreview.payoutCurrency,
                  )} à payer`
                : CORRESPONDENT_GNF_ONLY_MESSAGE
            }
          />
        </FieldSlot>
        <FieldSlot column="secondary" desktopClassName="md:col-start-2 md:row-start-3">
          <ReadOnlyField
            label="Taux actuel"
            value={
              exchangeRate
                ? transactionPreview?.formula ??
                  formatCorrespondentRate({ rateValue: exchangeRate.rate })
                : isExchangeRateLoading
                  ? 'Chargement du taux'
                  : CORRESPONDENT_RATE_MISSING_MESSAGE
            }
          />
        </FieldSlot>
        <FieldSlot column="secondary" desktopClassName="md:col-start-2 md:row-start-4">
          <TextField
            label="Note"
            onChange={(value) => setForm((current) => ({ ...current, note: value }))}
            value={form.note}
          />
        </FieldSlot>
        <FieldSlot column="primary" desktopClassName="md:col-start-1 md:row-start-4">
          <PinField
            onChange={(value) => setForm((current) => ({ ...current, transactionPin: value }))}
            value={form.transactionPin}
          />
        </FieldSlot>
        <FieldSlot column="secondary" desktopClassName="md:col-start-2 md:row-start-5">
          <SegmentedChoice
            label="Devise saisie"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                inputCurrency: value as 'FCFA' | 'GNF',
              }))
            }
            options={[
              { label: 'GNF', value: 'GNF' },
              { label: 'FCFA', value: 'FCFA' },
            ]}
            value={form.inputCurrency}
          />
        </FieldSlot>
        <FormFeedback
          error={
            formError ??
            (rateMissing ? CORRESPONDENT_RATE_MISSING_MESSAGE : null) ??
            createTransaction.error
          }
          success={result ? CORRESPONDENT_UI_TEXT.transactionCreated : null}
        />
        <SubmitButton disabled={isSaving || rateMissing}>
          {isSaving ? 'Création' : CORRESPONDENT_UI_TEXT.createTransaction}
        </SubmitButton>
      </form>
      ) : null}
    </section>
  )
}

function PayByCodeSection() {
  const [codeInput, setCodeInput] = useState('')
  const [lookupCode, setLookupCode] = useState('')
  const [transactionPin, setTransactionPin] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const transactionQuery = useCorrespondentTransaction(lookupCode, Boolean(lookupCode))
  const payTransaction = usePayCorrespondentTransactionByCode()
  const transaction = transactionQuery.data

  const onLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccess(null)
    setLookupCode(codeInput.trim())
  }

  const onPay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!transaction) {
      return
    }

    const referenceCode = transaction.collectionCode ?? transaction.referenceCode
    if (!referenceCode) {
      return
    }

    payTransaction.reset()
    setSuccess(null)

    try {
      await payTransaction.mutateAsync({
        code: referenceCode,
        payload: { transactionPin },
      })
      setTransactionPin('')
      setSuccess(CORRESPONDENT_UI_TEXT.paidByCode)
    } catch {
      setTransactionPin('')
    }
  }

  return (
    <section className="space-y-4">
      <PanelTitle>Payer par code</PanelTitle>
      <form className="flex max-w-2xl flex-col gap-3 sm:flex-row" onSubmit={onLookup}>
        <TextField
          label={CORRESPONDENT_UI_TEXT.transactionCode}
          onChange={setCodeInput}
          required
          value={codeInput}
        />
        <SubmitButton disabled={!codeInput.trim() || transactionQuery.isFetching}>
          Rechercher
        </SubmitButton>
      </form>
      <QueryErrors errors={[transactionQuery.error]} />
      {transaction ? (
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Detail
              label={CORRESPONDENT_UI_TEXT.transactionCode}
              value={transaction.collectionCode ?? transaction.referenceCode ?? 'Sans référence'}
            />
            <Detail label="Correspondant" value={transaction.correspondentName ?? transaction.correspondentEmail ?? 'Correspondant sans nom'} />
            <Detail label="Bénéficiaire" value={transaction.beneficiaryName} />
            <Detail label="Montant à payer" value={formatCorrespondentAmount(transaction.payoutAmount, transaction.payoutCurrency)} />
            <Detail label="Fonds détenus" value={formatCorrespondentAmount(transaction.amount, transaction.currency)} />
            {getTransactionRateLabel(transaction) ? (
              <Detail label="Taux utilisé" value={getTransactionRateLabel(transaction)} />
            ) : null}
            <Detail label="Statut" value={getTransactionStatusLabel(transaction.status)} />
          </dl>
          <p className="mt-3 text-sm text-slate-600">
            {getTransactionStatusMessage(transaction.status)}
          </p>
          {transaction.status === 'pending' && (transaction.collectionCode ?? transaction.referenceCode) ? (
            <form className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={onPay}>
              <PinField onChange={setTransactionPin} value={transactionPin} />
              <SubmitButton disabled={payTransaction.isPending || !transactionPin}>
                Confirmer le paiement
              </SubmitButton>
            </form>
          ) : null}
          <FormFeedback error={payTransaction.error} success={success} />
        </section>
      ) : null}
    </section>
  )
}

function TransactionsSection({
  transactions,
}: {
  transactions: CorrespondentTransaction[]
}) {
  if (transactions.length === 0) {
    return <StateMessage title="Aucune transaction">Aucun élément à afficher.</StateMessage>
  }

  return (
    <section className="grid gap-3">
      {transactions.map((transaction) => (
        <article
          className="rounded border border-slate-200 bg-white p-4 shadow-sm"
          key={transaction.id}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-950">
                {getReferenceLabel(transaction.collectionCode ?? transaction.referenceCode)}
              </p>
              <p className="text-sm text-slate-600">
                {transaction.beneficiaryName} ·{' '}
                {transaction.correspondentName ??
                  transaction.correspondentEmail ??
                  'Correspondant sans nom'}
              </p>
              <p className="text-xs text-slate-500">
                {getTransactionStatusMessage(transaction.status)}
              </p>
            </div>
            <div className="text-left md:text-right">
              <TransactionAmountSummary transaction={transaction} align="end" />
              <StatusBadge>{getTransactionStatusLabel(transaction.status)}</StatusBadge>
            </div>
          </div>
          {transaction.status === 'pending' ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <PayTransactionForm transaction={transaction} />
              <CancelTransactionForm transaction={transaction} />
              <RequestTransactionModificationForm transaction={transaction} />
            </div>
          ) : null}
        </article>
      ))}
    </section>
  )
}

function PayTransactionForm({
  transaction,
}: {
  transaction: CorrespondentTransaction
}) {
  const payById = usePayCorrespondentTransactionById()
  const [transactionPin, setTransactionPin] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    payById.reset()
    setSuccess(null)

    try {
      await payById.mutateAsync({
        id: transaction.id,
        payload: { transactionPin },
      })
      setTransactionPin('')
      setSuccess('Bénéficiaire payé.')
    } catch {
      setTransactionPin('')
    }
  }

  return (
    <form className="grid gap-3 rounded border border-slate-100 bg-slate-50 p-3" onSubmit={onSubmit}>
      <p className="text-sm font-semibold text-slate-900">Paiement transaction</p>
      <PinField onChange={setTransactionPin} value={transactionPin} />
      <SubmitButton disabled={payById.isPending || !transactionPin}>
        Payer
      </SubmitButton>
      <FormFeedback error={payById.error} success={success} />
    </form>
  )
}

function CancelTransactionForm({
  transaction,
}: {
  transaction: CorrespondentTransaction
}) {
  const cancelTransaction = useCancelCorrespondentTransaction()
  const cancelTransactionById = useCancelCorrespondentTransactionById()
  const [reason, setReason] = useState('')
  const [transactionPin, setTransactionPin] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    cancelTransaction.reset()
    cancelTransactionById.reset()
    setSuccess(null)

    try {
      const payload = {
        reason: optionalString(reason),
        transactionPin,
      }
      if (transaction.collectionCode) {
        await cancelTransaction.mutateAsync({
          code: transaction.collectionCode,
          payload,
        })
      } else {
        await cancelTransactionById.mutateAsync({
          id: transaction.id,
          payload,
        })
      }
      setReason('')
      setTransactionPin('')
      setSuccess('Transaction annulée.')
    } catch {
      setTransactionPin('')
    }
  }

  return (
    <form className="grid gap-3 rounded border border-slate-100 bg-slate-50 p-3" onSubmit={onSubmit}>
      <p className="text-sm font-semibold text-slate-900">Annulation transaction</p>
      <TextField label="Motif" onChange={setReason} value={reason} />
      <PinField onChange={setTransactionPin} value={transactionPin} />
      <SubmitButton disabled={(cancelTransaction.isPending || cancelTransactionById.isPending) || !transactionPin}>
        Annuler
      </SubmitButton>
      <FormFeedback error={cancelTransaction.error ?? cancelTransactionById.error} success={success} />
    </form>
  )
}

function RequestTransactionModificationForm({
  transaction,
}: {
  transaction: CorrespondentTransaction
}) {
  const requestModification = useRequestCorrespondentTransactionModification()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const parsedAmount = parseCorrespondentAmountInput(amount)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    requestModification.reset()
    setSuccess(null)

    if (!parsedAmount.amount) {
      return
    }

    try {
      await requestModification.mutateAsync({
        id: transaction.id,
        payload: {
          requestedValues: { payoutAmount: parsedAmount.amount },
          reason: optionalString(reason),
        },
      })
      setAmount('')
      setReason('')
      setSuccess('Demande de modification envoyée.')
    } catch {
      // Mutation feedback is rendered below.
    }
  }

  return (
    <form className="grid gap-3 rounded border border-slate-100 bg-slate-50 p-3" onSubmit={onSubmit}>
      <p className="text-sm font-semibold text-slate-900">Demande de modification</p>
      <TextField
        error={amount && !parsedAmount.amount ? CORRESPONDENT_AMOUNT_INTEGER_MESSAGE : null}
        inputMode="numeric"
        label="Nouveau montant à payer"
        onChange={setAmount}
        required
        value={amount}
      />
      <TextField label="Motif" onChange={setReason} required value={reason} />
      <SubmitButton
        disabled={requestModification.isPending || !parsedAmount.amount || !reason.trim()}
      >
        Demander
      </SubmitButton>
      <FormFeedback error={requestModification.error} success={success} />
    </form>
  )
}

function CreateWithdrawalSection({
  correspondents,
}: {
  correspondents: CorrespondentSummary[]
}) {
  const createWithdrawal = useCreateCorrespondentWithdrawal()
  const [selectedCorrespondentIdInput, setSelectedCorrespondentIdInput] =
    useState('')
  const [form, setForm] = useState({
    amount: '',
    beneficiaryName: '',
    beneficiaryPhone: '',
    note: '',
    transactionPin: '',
  })
  const [amountTouched, setAmountTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<CorrespondentWithdrawal | null>(null)
  const selectedCorrespondentId = getAutoSelectedCorrespondentId({
    correspondents,
    selectedCorrespondentId: selectedCorrespondentIdInput,
  })
  const correspondent = getCorrespondentById(correspondents, selectedCorrespondentId)
  const parsedAmount = parseCorrespondentAmountInput(form.amount)
  const warning = getWithdrawalWarning({
    amount: parsedAmount.amount,
    correspondent,
  })
  const showAmountError = amountTouched || submitted
  const visibleAmountError = showAmountError ? parsedAmount.error : null

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setResult(null)
    createWithdrawal.reset()

    if (!correspondent) {
      return
    }

    if (parsedAmount.error || !parsedAmount.amount) {
      return
    }

    try {
      const withdrawal = await createWithdrawal.mutateAsync({
        amount: parsedAmount.amount,
        beneficiaryName: form.beneficiaryName.trim(),
        beneficiaryPhone: optionalString(form.beneficiaryPhone),
        correspondentMembershipId: correspondent.membershipId,
        currency: correspondent.currency,
        idempotencyKey: createIdempotencyKey('correspondent-withdrawal'),
        note: optionalString(form.note),
        transactionPin: form.transactionPin,
      })
      setResult(withdrawal)
      setForm({
        amount: '',
        beneficiaryName: '',
        beneficiaryPhone: '',
        note: '',
        transactionPin: '',
      })
      setAmountTouched(false)
      setSubmitted(false)
    } catch {
      setForm((current) => ({ ...current, transactionPin: '' }))
    }
  }

  return (
    <section className="space-y-4">
      <PanelTitle>{CORRESPONDENT_UI_TEXT.makeWithdrawal}</PanelTitle>
      {result ? (
        <WithdrawalSuccessCard
          correspondent={correspondent}
          withdrawal={result}
        />
      ) : null}
      <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <CorrespondentSelect
          correspondents={correspondents}
          onChange={setSelectedCorrespondentIdInput}
          value={selectedCorrespondentId}
        />
        <ReadOnlyField label="Devise" value={correspondent?.currency ?? '—'} />
        {correspondent ? (
          <ReadOnlyField
            label={`Disponible chez ${getCorrespondentVisibleIdentity(correspondent).primary}`}
            value={formatCorrespondentAmount(
              correspondent.availableBalance,
              correspondent.currency,
            )}
          />
        ) : null}
        <TextField
          error={visibleAmountError}
          inputMode="numeric"
          label="Montant à retirer"
          onBlur={() => setAmountTouched(true)}
          onChange={(value) => {
            setAmountTouched(true)
            setForm((current) => ({ ...current, amount: value }))
          }}
          required
          value={form.amount}
        />
        <TextField
          label="Bénéficiaire"
          onChange={(value) => setForm((current) => ({ ...current, beneficiaryName: value }))}
          required
          value={form.beneficiaryName}
        />
        <TextField
          label="Téléphone bénéficiaire"
          onChange={(value) => setForm((current) => ({ ...current, beneficiaryPhone: value }))}
          value={form.beneficiaryPhone}
        />
        <TextField
          label="Note"
          onChange={(value) => setForm((current) => ({ ...current, note: value }))}
          value={form.note}
        />
        <PinField
          onChange={(value) => setForm((current) => ({ ...current, transactionPin: value }))}
          value={form.transactionPin}
        />
        <FormFeedback
          error={warning ?? createWithdrawal.error}
          success={null}
        />
        <SubmitButton
          disabled={
            createWithdrawal.isPending ||
            !correspondent ||
            !parsedAmount.amount ||
            !form.transactionPin
          }
        >
          {createWithdrawal.isPending ? 'Création' : CORRESPONDENT_UI_TEXT.makeWithdrawal}
        </SubmitButton>
      </form>
    </section>
  )
}

function WithdrawalsSection({
  correspondents,
  isManager,
  withdrawals,
}: {
  correspondents: CorrespondentSummary[]
  isManager: boolean
  withdrawals: CorrespondentWithdrawal[]
}) {
  if (withdrawals.length === 0) {
    return <StateMessage title="Aucun retrait">Aucun élément à afficher.</StateMessage>
  }

  return (
    <section className="grid gap-3">
      {withdrawals.map((withdrawal) => (
        <article
          className="rounded border border-slate-200 bg-white p-4 shadow-sm"
          key={withdrawal.id}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-950">
                {getReferenceLabel(withdrawal.deliveryCode ?? withdrawal.referenceCode)}
              </p>
              <p className="text-sm text-slate-600">
                {withdrawal.beneficiaryName} ·{' '}
                {withdrawal.correspondentName ??
                  withdrawal.correspondentEmail ??
                  'Correspondant sans nom'}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm font-medium text-slate-950">
                {formatCorrespondentAmount(withdrawal.amount, withdrawal.currency)}
              </p>
              <StatusBadge>{getWithdrawalStatusLabel(withdrawal.status)}</StatusBadge>
            </div>
          </div>
          {withdrawal.status === 'pending' && isManager ? (
            <CancelWithdrawalForm withdrawal={withdrawal} />
          ) : null}
          {withdrawal.status === 'pending' && !isManager ? (
            <ConfirmWithdrawalForm
              correspondent={getCorrespondentById(
                correspondents,
                withdrawal.correspondentMembership,
              )}
              withdrawal={withdrawal}
            />
          ) : null}
          {withdrawal.status === 'pending' ? (
            <RequestWithdrawalModificationForm withdrawal={withdrawal} />
          ) : null}
        </article>
      ))}
    </section>
  )
}

function ConfirmWithdrawalForm({
  correspondent,
  withdrawal,
}: {
  correspondent: CorrespondentSummary | null
  withdrawal: CorrespondentWithdrawal
}) {
  const confirmWithdrawal = useConfirmCorrespondentWithdrawal()
  const confirmWithdrawalById = useConfirmCorrespondentWithdrawalById()
  const [transactionPin, setTransactionPin] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    confirmWithdrawal.reset()
    confirmWithdrawalById.reset()
    setSuccess(null)

    try {
      if (withdrawal.deliveryCode) {
        await confirmWithdrawal.mutateAsync({
          code: withdrawal.deliveryCode,
          payload: { transactionPin },
        })
      } else {
        await confirmWithdrawalById.mutateAsync({
          id: withdrawal.id,
          payload: { transactionPin },
        })
      }
      setTransactionPin('')
      setSuccess(CORRESPONDENT_UI_TEXT.withdrawalConfirmed)
    } catch {
      setTransactionPin('')
    }
  }

  return (
    <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
      {correspondent ? (
        <ReadOnlyField
          label="Correspondant"
          value={getCorrespondentVisibleIdentity(correspondent).primary}
        />
      ) : null}
      <PinField onChange={setTransactionPin} value={transactionPin} />
      <SubmitButton
        disabled={
          confirmWithdrawal.isPending ||
          confirmWithdrawalById.isPending ||
          !transactionPin
        }
      >
        {CORRESPONDENT_UI_TEXT.confirmWithdrawal}
      </SubmitButton>
      <FormFeedback
        error={confirmWithdrawal.error ?? confirmWithdrawalById.error}
        success={success}
      />
    </form>
  )
}

function CancelWithdrawalForm({
  withdrawal,
}: {
  withdrawal: CorrespondentWithdrawal
}) {
  const cancelWithdrawal = useCancelCorrespondentWithdrawal()
  const cancelWithdrawalById = useCancelCorrespondentWithdrawalById()
  const [reason, setReason] = useState('')
  const [transactionPin, setTransactionPin] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    cancelWithdrawal.reset()
    cancelWithdrawalById.reset()
    setSuccess(null)

    try {
      const payload = {
        reason: optionalString(reason),
        transactionPin,
      }
      if (withdrawal.deliveryCode) {
        await cancelWithdrawal.mutateAsync({
          code: withdrawal.deliveryCode,
          payload,
        })
      } else {
        await cancelWithdrawalById.mutateAsync({
          id: withdrawal.id,
          payload,
        })
      }
      setReason('')
      setTransactionPin('')
      setSuccess('Retrait annulé.')
    } catch {
      setTransactionPin('')
    }
  }

  return (
    <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
      <TextField label="Motif" onChange={setReason} value={reason} />
      <PinField onChange={setTransactionPin} value={transactionPin} />
      <SubmitButton
        disabled={
          cancelWithdrawal.isPending ||
          cancelWithdrawalById.isPending ||
          !transactionPin
        }
      >
        Annuler
      </SubmitButton>
      <FormFeedback
        error={cancelWithdrawal.error ?? cancelWithdrawalById.error}
        success={success}
      />
    </form>
  )
}

function RequestWithdrawalModificationForm({
  withdrawal,
}: {
  withdrawal: CorrespondentWithdrawal
}) {
  const requestModification = useRequestCorrespondentWithdrawalModification()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const parsedAmount = parseCorrespondentAmountInput(amount)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    requestModification.reset()
    setSuccess(null)

    if (!parsedAmount.amount) {
      return
    }

    try {
      await requestModification.mutateAsync({
        id: withdrawal.id,
        payload: {
          requestedValues: { amount: parsedAmount.amount },
          reason: optionalString(reason),
        },
      })
      setAmount('')
      setReason('')
      setSuccess('Demande de modification envoyée.')
    } catch {
      // Mutation feedback is rendered below.
    }
  }

  return (
    <form className="mt-4 grid gap-3 rounded border border-slate-100 bg-slate-50 p-3 md:grid-cols-3" onSubmit={onSubmit}>
      <p className="text-sm font-semibold text-slate-900 md:col-span-3">
        Demande de modification
      </p>
      <TextField
        error={amount && !parsedAmount.amount ? CORRESPONDENT_AMOUNT_INTEGER_MESSAGE : null}
        inputMode="numeric"
        label="Nouveau montant"
        onChange={setAmount}
        required
        value={amount}
      />
      <TextField label="Motif" onChange={setReason} required value={reason} />
      <SubmitButton
        disabled={requestModification.isPending || !parsedAmount.amount || !reason.trim()}
      >
        Demander
      </SubmitButton>
      <FormFeedback error={requestModification.error} success={success} />
    </form>
  )
}

function ModificationRequestsSection({
  isManager,
  requests,
}: {
  isManager: boolean
  requests: CorrespondentModificationRequest[]
}) {
  if (requests.length === 0) {
    return (
      <StateMessage title="Aucune modification">
        Aucune demande de modification à afficher.
      </StateMessage>
    )
  }

  return (
    <section className="grid gap-3">
      {requests.map((request) => (
        <article
          className="rounded border border-slate-200 bg-white p-4 shadow-sm"
          key={request.id}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {request.targetType === 'collection' ? 'Transaction' : 'Retrait'} ·{' '}
                {getModificationStatusLabel(request.status)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Demandé par {request.initiatedByName ?? 'Utilisateur'} le{' '}
                {formatDateTime(request.createdAt)}
              </p>
            </div>
            <StatusBadge>{getModificationStatusLabel(request.status)}</StatusBadge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Detail
              label="Anciennes valeurs"
              value={formatModificationValues(request.oldValues)}
            />
            <Detail
              label="Valeurs demandées"
              value={formatModificationValues(request.requestedValues)}
            />
            <Detail label="Motif" value={request.reason ?? 'Non renseigné'} />
            <Detail label="Cible" value={request.targetId} />
            {request.decisionReason ? (
              <Detail label="Décision" value={request.decisionReason} />
            ) : null}
          </dl>
          {isManager && request.status === 'pending' ? (
            <ModificationDecisionForm request={request} />
          ) : null}
        </article>
      ))}
    </section>
  )
}

function ModificationDecisionForm({
  request,
}: {
  request: CorrespondentModificationRequest
}) {
  const approveRequest = useApproveCorrespondentModificationRequest()
  const rejectRequest = useRejectCorrespondentModificationRequest()
  const [transactionPin, setTransactionPin] = useState('')
  const [reason, setReason] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const decide = async (decision: 'approve' | 'reject') => {
    const mutation = decision === 'approve' ? approveRequest : rejectRequest
    approveRequest.reset()
    rejectRequest.reset()
    setSuccess(null)

    try {
      await mutation.mutateAsync({
        id: request.id,
        payload: {
          transactionPin,
          reason: optionalString(reason),
        },
      })
      setTransactionPin('')
      setReason('')
      setSuccess(
        decision === 'approve'
          ? 'Modification approuvée.'
          : 'Modification rejetée.',
      )
    } catch {
      setTransactionPin('')
    }
  }

  return (
    <div className="mt-4 grid gap-3 rounded border border-slate-100 bg-slate-50 p-3 md:grid-cols-3">
      <TextField label="Note décision" onChange={setReason} value={reason} />
      <PinField onChange={setTransactionPin} value={transactionPin} />
      <div className="flex flex-col gap-2 sm:flex-row md:self-end">
        <button
          className="h-10 rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={approveRequest.isPending || rejectRequest.isPending || !transactionPin}
          onClick={() => void decide('approve')}
          type="button"
        >
          Approuver
        </button>
        <button
          className="h-10 rounded border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={approveRequest.isPending || rejectRequest.isPending || !transactionPin}
          onClick={() => void decide('reject')}
          type="button"
        >
          Rejeter
        </button>
      </div>
      <FormFeedback
        error={approveRequest.error ?? rejectRequest.error}
        success={success}
      />
    </div>
  )
}

export function WithdrawalSuccessCard({
  correspondent,
  withdrawal,
}: {
  correspondent: CorrespondentSummary | null
  withdrawal: CorrespondentWithdrawal
}) {
  return (
    <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-semibold">
        Retrait créé. Le montant est maintenant réservé chez le correspondant en attente de confirmation.
      </p>
      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        <Detail
          label="Référence retrait"
          value={withdrawal.deliveryCode ?? withdrawal.referenceCode ?? 'Sans référence'}
        />
        <Detail
          label="Correspondant"
          value={
            correspondent
              ? getCorrespondentVisibleIdentity(correspondent).primary
              : withdrawal.correspondentName ??
                withdrawal.correspondentEmail ??
                'Correspondant sans nom'
          }
        />
        <Detail label="Bénéficiaire" value={withdrawal.beneficiaryName} />
        <Detail
          label="Montant à retirer"
          value={formatCorrespondentAmount(withdrawal.amount, withdrawal.currency)}
        />
        <Detail label="Statut" value={getWithdrawalStatusLabel(withdrawal.status)} />
      </dl>
    </section>
  )
}

function TransactionSuccessCard({
  transaction,
}: {
  transaction: CorrespondentTransaction
}) {
  const referenceCode = transaction.collectionCode ?? transaction.referenceCode
  const copyCode = async () => {
    if (!referenceCode) {
      return
    }

    await navigator.clipboard?.writeText(referenceCode)
  }

  return (
    <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-semibold">Transaction créée</p>
      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        <Detail
          label={CORRESPONDENT_UI_TEXT.transactionCode}
          value={referenceCode ?? 'Sans référence'}
        />
        <Detail label="Bénéficiaire" value={transaction.beneficiaryName} />
        <Detail label="Montant à payer" value={formatCorrespondentAmount(transaction.payoutAmount, transaction.payoutCurrency)} />
        <Detail label="Fonds détenus" value={formatCorrespondentAmount(transaction.amount, transaction.currency)} />
        <Detail label="Statut" value={getTransactionStatusLabel(transaction.status)} />
      </dl>
      <p className="mt-3">{getTransactionStatusMessage(transaction.status)}</p>
      {referenceCode ? (
        <button
          className="mt-3 h-9 rounded border border-emerald-300 px-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
          onClick={() => void copyCode()}
          type="button"
        >
          Copier la référence
        </button>
      ) : null}
    </section>
  )
}

function TransactionPinRequiredCard({
  actionLabel,
  description,
  onConfigure,
  title,
}: {
  actionLabel: string
  description: string
  onConfigure: () => void
  title: string
}) {
  return (
    <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2">{description}</p>
      <button
        className="mt-3 h-9 rounded bg-amber-900 px-3 text-sm font-medium text-white transition hover:bg-amber-800"
        onClick={onConfigure}
        type="button"
      >
        {actionLabel}
      </button>
    </section>
  )
}

function CorrespondentSelect({
  correspondents,
  onChange,
  value,
}: {
  correspondents: CorrespondentSummary[]
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      Correspondant
      <select
        className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Sélectionner</option>
        {correspondents.map((correspondent) => {
          const identity = getCorrespondentVisibleIdentity(correspondent)

          return (
            <option key={correspondent.membershipId} value={correspondent.membershipId}>
              {identity.primary} · {correspondent.currency} ·{' '}
              {formatCorrespondentAmount(
                correspondent.availableBalance,
                correspondent.currency,
              )}{' '}
              disponible
            </option>
          )
        })}
      </select>
    </label>
  )
}

function TabList({
  activeTab,
  onTabChange,
  tabs,
}: {
  activeTab: CorrespondentTab
  onTabChange: (tab: CorrespondentTab) => void
  tabs: readonly { label: string; value: CorrespondentTab }[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          className={`h-9 rounded border px-3 text-sm font-medium transition ${
            activeTab === tab.value
              ? 'border-slate-950 bg-slate-950 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </section>
  )
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-950">{children}</h2>
}

function FieldSlot({
  children,
  column,
  desktopClassName,
}: {
  children: ReactNode
  column: 'primary' | 'secondary'
  desktopClassName: string
}) {
  return (
    <div
      className={desktopClassName}
      data-correspondent-form-column={column}
    >
      {children}
    </div>
  )
}

function TransactionAmountSummary({
  align = 'start',
  transaction,
}: {
  align?: 'start' | 'end'
  transaction: CorrespondentTransaction
}) {
  const alignmentClass = align === 'end' ? 'md:items-end md:text-right' : ''

  return (
    <dl className={`space-y-2 text-sm ${alignmentClass}`}>
      <div>
        <dt className="text-xs font-medium uppercase text-slate-500">
          Montant à payer
        </dt>
        <dd className="mt-1 font-semibold text-slate-950">
          {formatCorrespondentAmount(
            transaction.payoutAmount,
            transaction.payoutCurrency,
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-slate-500">
          Fonds détenus
        </dt>
        <dd className="mt-1 text-slate-600">
          {formatCorrespondentAmount(transaction.amount, transaction.currency)}
        </dd>
      </div>
    </dl>
  )
}

function TextField({
  error,
  inputMode,
  label,
  onBlur,
  onChange,
  required,
  value,
}: {
  error?: string | null
  inputMode?: 'numeric'
  label: string
  onBlur?: () => void
  onChange: (value: string) => void
  required?: boolean
  value: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  const errorId = `${id}-error`

  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        inputMode={inputMode}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type="text"
        value={value}
      />
      {error ? (
        <span className="mt-1 block text-xs font-medium text-red-700" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  )
}

function PinField({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      PIN de transaction
      <input
        autoComplete="off"
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        pattern="[0-9]{6}"
        type="password"
        value={value}
      />
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 flex min-h-10 items-center rounded border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900">
        {value}
      </p>
    </div>
  )
}

function SegmentedChoice({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-1 grid grid-cols-2 gap-1 rounded border border-slate-200 bg-slate-50 p-1">
        {options.map((option) => {
          const isSelected = option.value === value

          return (
            <button
              className={
                isSelected
                  ? 'h-8 rounded bg-slate-950 px-2 text-xs font-medium text-white'
                  : 'h-8 rounded px-2 text-xs font-medium text-slate-700 hover:bg-white'
              }
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SubmitButton({
  children,
  disabled,
}: {
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      className="h-10 self-end rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  )
}

function FormFeedback({
  error,
  success,
}: {
  error?: unknown
  success?: string | null
}) {
  if (error) {
    const message =
      typeof error === 'string' ? error : getCorrespondentErrorMessage(error)

    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
        {message}
      </p>
    )
  }

  if (success) {
    return (
      <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2">
        {success}
      </p>
    )
  }

  return null
}

function QueryErrors({ errors }: { errors: unknown[] }) {
  const error = errors.find(Boolean)

  return error ? (
    <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {getCorrespondentErrorMessage(error)}
    </p>
  ) : null
}

function StateMessage({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-950">{value}</dd>
    </div>
  )
}

function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="mt-2 inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  )
}

function getModificationStatusLabel(status: CorrespondentModificationRequest['status']) {
  if (status === 'approved') {
    return 'Approuvée'
  }

  if (status === 'rejected') {
    return 'Rejetée'
  }

  return 'En attente'
}

function formatModificationValues(values: Record<string, unknown>) {
  const entries = Object.entries(values)

  if (entries.length === 0) {
    return 'Aucune valeur'
  }

  return entries
    .map(([key, value]) => `${formatModificationKey(key)}: ${formatModificationValue(value)}`)
    .join(' · ')
}

function formatModificationKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (firstLetter) => firstLetter.toUpperCase())
}

function formatModificationValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Non renseigné'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim()

  return trimmed || undefined
}

function getReferenceLabel(value: string | null | undefined): string {
  return value?.trim() || 'Sans référence'
}

function getTransactionRateLabel(
  transaction: CorrespondentTransaction,
): string | null {
  if (
    typeof transaction.rateValue !== 'number' ||
    !Number.isFinite(transaction.rateValue)
  ) {
    return null
  }

  return formatCorrespondentRate({
    rateBaseAmount:
      typeof transaction.rateBaseAmount === 'number' &&
      Number.isFinite(transaction.rateBaseAmount)
        ? transaction.rateBaseAmount
        : undefined,
    rateValue: transaction.rateValue,
  })
}
