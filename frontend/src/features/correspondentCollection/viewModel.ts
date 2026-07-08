import type { AuthRole } from '../auth/types.ts'
import type {
  CorrespondentCurrency,
  CorrespondentConversionDirection,
  CorrespondentInputSide,
  CorrespondentSummary,
  CorrespondentTransaction,
  CorrespondentTransactionStatus,
  CorrespondentWithdrawal,
  CorrespondentWithdrawalStatus,
} from './types.ts'

export type CorrespondentManagerTab =
  | 'overview'
  | 'pay-by-code'
  | 'transactions'
  | 'create-withdrawal'
  | 'withdrawals'
  | 'modification-requests'

export type CorrespondentPartnerTab =
  | 'create-transaction'
  | 'my-transactions'
  | 'my-withdrawals'
  | 'modification-requests'

export type CorrespondentTab = CorrespondentManagerTab | CorrespondentPartnerTab

export type CorrespondentTabDefinition<TTab extends CorrespondentTab> = {
  label: string
  value: TTab
}

export type CorrespondentVisibleIdentity = {
  primary: string
  secondary: string | null
}

export type CurrencyBalanceSummary = {
  currency: CorrespondentCurrency
  balance: number
  reservedBalance: number
}

export type CorrespondentOverview = {
  pendingTransactionCount: number
  paidTransactionCount: number
  canceledTransactionCount: number
  pendingWithdrawalCount: number
  confirmedWithdrawalCount: number
  canceledWithdrawalCount: number
  heldBalances: CurrencyBalanceSummary[]
}

export const CORRESPONDENT_AMOUNT_INTEGER_MESSAGE =
  'Le montant doit être un nombre entier FCFA/GNF.'
export const CORRESPONDENT_GNF_ONLY_MESSAGE =
  'Choisissez la devise saisie pour calculer le montant correspondant.'
export const CORRESPONDENT_RATE_MISSING_MESSAGE =
  'Aucun taux configuré. Contactez le manager avant de créer une transaction.'

export const CORRESPONDENT_MANAGER_TABS = [
  { label: 'Vue d’ensemble', value: 'overview' },
  { label: 'Payer par code', value: 'pay-by-code' },
  { label: 'Transactions', value: 'transactions' },
  { label: 'Faire un retrait', value: 'create-withdrawal' },
  { label: 'Retraits', value: 'withdrawals' },
  { label: 'Modifications', value: 'modification-requests' },
] as const satisfies readonly CorrespondentTabDefinition<CorrespondentManagerTab>[]

export const CORRESPONDENT_PARTNER_TABS = [
  { label: 'Créer une transaction', value: 'create-transaction' },
  { label: 'Mes transactions', value: 'my-transactions' },
  { label: 'Mes retraits', value: 'my-withdrawals' },
  { label: 'Modifications', value: 'modification-requests' },
] as const satisfies readonly CorrespondentTabDefinition<CorrespondentPartnerTab>[]

export const CORRESPONDENT_MANAGER_DEFAULT_TAB = 'overview'
export const CORRESPONDENT_PARTNER_DEFAULT_TAB = 'create-transaction'

export const CORRESPONDENT_UI_TEXT = {
  navLabel: 'Correspondants',
  pageTitle: 'Transactions correspondants',
  transactionCode: 'Code transaction',
  createTransaction: 'Créer une transaction',
  myTransactions: 'Mes transactions',
  makeWithdrawal: 'Faire un retrait',
  myWithdrawals: 'Mes retraits',
  confirmWithdrawal: 'Confirmer le retrait',
  transactionCreated:
    'Transaction créée. Les fonds sont maintenant enregistrés comme détenus par le correspondant.',
  pendingExplanation:
    'Fonds reçus par le correspondant, bénéficiaire pas encore payé.',
  paidByCode:
    'Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.',
  withdrawalConfirmed:
    'Retrait confirmé. Votre solde détenu pour l’entreprise a été diminué.',
} as const

const TRANSACTION_STATUS_LABELS: Record<CorrespondentTransactionStatus, string> = {
  pending: 'En attente de paiement',
  paid: 'Bénéficiaire payé',
  confirmed: 'Bénéficiaire payé',
  canceled: 'Annulée',
}

const TRANSACTION_STATUS_MESSAGES: Record<CorrespondentTransactionStatus, string> = {
  pending: 'Fonds reçus par le correspondant, bénéficiaire pas encore payé.',
  paid: 'Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.',
  confirmed:
    'Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.',
  canceled: 'Transaction annulée. L’effet sur le solde correspondant a été reversé.',
}

const WITHDRAWAL_STATUS_LABELS: Record<CorrespondentWithdrawalStatus, string> = {
  pending: 'Retrait en attente',
  confirmed: 'Retrait confirmé',
  canceled: 'Annulé',
}

const CORRESPONDENT_ERROR_MESSAGES: Record<string, string> = {
  PIN_NOT_CONFIGURED: 'Configurez votre PIN de transaction avant de continuer.',
  TRANSACTION_PIN_NOT_CONFIGURED:
    'Configurez votre PIN de transaction avant de continuer.',
  INVALID_PIN: 'PIN de transaction invalide.',
  IDEMPOTENCY_KEY_REQUIRED: 'Actualisez la page puis réessayez.',
  IDEMPOTENCY_KEY_CONFLICT:
    'Cette action a déjà été envoyée avec des données différentes. Actualisez avant de réessayer.',
  INVALID_COLLECTION_AMOUNT: CORRESPONDENT_AMOUNT_INTEGER_MESSAGE,
  INVALID_DELIVERY_AMOUNT: CORRESPONDENT_AMOUNT_INTEGER_MESSAGE,
  INVALID_COLLECTION_PAYOUT_AMOUNT: CORRESPONDENT_AMOUNT_INTEGER_MESSAGE,
  CORRESPONDENT_TRANSACTION_RATE_FIELDS_NOT_ALLOWED:
    'Actualisez la page puis réessayez.',
  CORRESPONDENT_TRANSACTION_RATE_NOT_CONFIGURED:
    CORRESPONDENT_RATE_MISSING_MESSAGE,
  CORRESPONDENT_TRANSACTION_GNF_ONLY: CORRESPONDENT_GNF_ONLY_MESSAGE,
  INVALID_COLLECTION_CURRENCY: 'Devise de transaction invalide.',
  INVALID_DELIVERY_CURRENCY: 'Devise de retrait invalide.',
  INVALID_COLLECTION_PAYOUT_CURRENCY: 'Devise de paiement invalide.',
  CORRESPONDENT_MEMBERSHIP_NOT_FOUND: 'Correspondant actif introuvable.',
  INVALID_CORRESPONDENT_MEMBERSHIP: 'Sélectionnez un correspondant actif.',
  INSUFFICIENT_CORRESPONDENT_AVAILABLE_BALANCE:
    'Solde disponible du correspondant insuffisant.',
  CORRESPONDENT_COLLECTION_NOT_FOUND: 'Code transaction introuvable.',
  CORRESPONDENT_DELIVERY_NOT_FOUND: 'Retrait introuvable.',
  CORRESPONDENT_COLLECTION_ALREADY_PAID: 'Transaction déjà payée.',
  CORRESPONDENT_COLLECTION_PAID: 'Transaction déjà payée.',
  CORRESPONDENT_COLLECTION_ALREADY_CANCELED: 'Transaction annulée.',
  CORRESPONDENT_COLLECTION_CANCELED: 'Transaction annulée.',
  CORRESPONDENT_COLLECTION_PAY_NOT_ALLOWED:
    'Cette transaction ne peut plus être payée.',
  CORRESPONDENT_COLLECTION_CANCEL_NOT_ALLOWED:
    'Cette transaction ne peut plus être annulée.',
  CORRESPONDENT_DELIVERY_ALREADY_CONFIRMED: 'Retrait déjà confirmé.',
  CORRESPONDENT_DELIVERY_CONFIRMED: 'Retrait déjà confirmé.',
  CORRESPONDENT_DELIVERY_ALREADY_CANCELED: 'Retrait annulé.',
  CORRESPONDENT_DELIVERY_CANCELED: 'Retrait annulé.',
  CORRESPONDENT_DELIVERY_CONFIRM_NOT_ALLOWED:
    'Ce retrait ne peut plus être confirmé.',
  CORRESPONDENT_DELIVERY_CANCEL_NOT_ALLOWED:
    'Ce retrait ne peut plus être annulé.',
  CORRESPONDENT_COLLECTION_ACCESS_DENIED:
    "Vous n'avez pas accès à cette transaction.",
  CORRESPONDENT_DELIVERY_ACCESS_DENIED:
    "Vous n'avez pas accès à ce retrait.",
  CORRESPONDENT_DELIVERY_ASSIGNED_PARTNER_REQUIRED:
    'Seul le correspondant assigné peut confirmer ce retrait.',
  CORRESPONDENT_DELIVERY_MANAGER_REQUIRED:
    'Seul un gestionnaire peut créer ou annuler un retrait.',
  CORRESPONDENT_COLLECTION_MANAGER_REQUIRED:
    'Seul un gestionnaire peut payer cette transaction.',
}

export function resolveCorrespondentTab(
  role: AuthRole | undefined,
  requestedTab: string | null,
): CorrespondentTab {
  if (role === 'manager') {
    return isManagerTab(requestedTab)
      ? requestedTab
      : CORRESPONDENT_MANAGER_DEFAULT_TAB
  }

  return isPartnerTab(requestedTab)
    ? requestedTab
    : CORRESPONDENT_PARTNER_DEFAULT_TAB
}

export function getTransactionStatusLabel(
  status: CorrespondentTransactionStatus,
): string {
  return TRANSACTION_STATUS_LABELS[status] ?? status
}

export function getTransactionStatusMessage(
  status: CorrespondentTransactionStatus,
): string {
  return TRANSACTION_STATUS_MESSAGES[status] ?? TRANSACTION_STATUS_MESSAGES.pending
}

export function getWithdrawalStatusLabel(
  status: CorrespondentWithdrawalStatus,
): string {
  return WITHDRAWAL_STATUS_LABELS[status] ?? status
}

export function parseCorrespondentAmountInput(value: unknown): {
  amount: number | null
  error: string | null
} {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return { amount: null, error: CORRESPONDENT_AMOUNT_INTEGER_MESSAGE }
  }

  const normalized = String(value).trim()

  if (!normalized || /[,.]\d{1,2}$/.test(normalized)) {
    return { amount: null, error: CORRESPONDENT_AMOUNT_INTEGER_MESSAGE }
  }

  const withoutGroupSeparators = normalized.replace(/[ .]/g, '')

  if (!/^\d+$/.test(withoutGroupSeparators)) {
    return { amount: null, error: CORRESPONDENT_AMOUNT_INTEGER_MESSAGE }
  }

  const amount = Number(withoutGroupSeparators)

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { amount: null, error: CORRESPONDENT_AMOUNT_INTEGER_MESSAGE }
  }

  return { amount, error: null }
}

export function formatCorrespondentAmount(
  amount: number,
  currency: CorrespondentCurrency,
): string {
  return `${formatNumber(amount)} ${currency}`
}

function formatNumber(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function calculateCorrespondentPayoutPreview({
  rateValue,
  receivedAmount,
}: {
  rateValue: number | null | undefined
  receivedAmount: number | null | undefined
}): number | null {
  if (
    typeof receivedAmount !== 'number' ||
    !Number.isFinite(receivedAmount) ||
    receivedAmount <= 0 ||
    typeof rateValue !== 'number' ||
    !Number.isFinite(rateValue) ||
    rateValue <= 0
  ) {
    return null
  }

  const payoutAmount = Math.floor((receivedAmount * 5000) / rateValue)

  return payoutAmount > 0 ? payoutAmount : null
}

export type CorrespondentTransactionPreview = {
  amount: number
  currency: CorrespondentCurrency
  payoutAmount: number
  payoutCurrency: CorrespondentCurrency
  conversionDirection: CorrespondentConversionDirection
  formula: string
}

export function calculateCorrespondentTransactionPreview({
  inputAmount,
  inputCurrency,
  inputSide,
  rateValue,
}: {
  inputAmount: number | null | undefined
  inputCurrency: CorrespondentCurrency | null | undefined
  inputSide: CorrespondentInputSide
  rateValue: number | null | undefined
}): CorrespondentTransactionPreview | null {
  if (
    typeof inputAmount !== 'number' ||
    !Number.isFinite(inputAmount) ||
    inputAmount <= 0 ||
    !inputCurrency ||
    typeof rateValue !== 'number' ||
    !Number.isFinite(rateValue) ||
    rateValue <= 0
  ) {
    return null
  }

  if (inputCurrency === 'GNF') {
    const converted = Math.floor((inputAmount * 5000) / rateValue)

    if (converted <= 0) {
      return null
    }

    if (inputSide === 'account') {
      return {
        amount: inputAmount,
        currency: 'GNF',
        payoutAmount: converted,
        payoutCurrency: 'FCFA',
        conversionDirection: 'GNF_TO_FCFA',
        formula: `${formatCorrespondentAmount(inputAmount, 'GNF')} × 5\u202f000 / ${formatNumber(rateValue)} = ${formatCorrespondentAmount(converted, 'FCFA')}`,
      }
    }

    return {
      amount: converted,
      currency: 'FCFA',
      payoutAmount: inputAmount,
      payoutCurrency: 'GNF',
      conversionDirection: 'GNF_TO_FCFA',
      formula: `${formatCorrespondentAmount(inputAmount, 'GNF')} × 5\u202f000 / ${formatNumber(rateValue)} = ${formatCorrespondentAmount(converted, 'FCFA')}`,
    }
  }

  const converted = Math.floor((inputAmount / 5000) * rateValue)

  if (converted <= 0) {
    return null
  }

  if (inputSide === 'account') {
    return {
      amount: inputAmount,
      currency: 'FCFA',
      payoutAmount: converted,
      payoutCurrency: 'GNF',
      conversionDirection: 'FCFA_TO_GNF',
      formula: `${formatCorrespondentAmount(inputAmount, 'FCFA')} / 5\u202f000 × ${formatNumber(rateValue)} = ${formatCorrespondentAmount(converted, 'GNF')}`,
    }
  }

  return {
    amount: converted,
    currency: 'GNF',
    payoutAmount: inputAmount,
    payoutCurrency: 'FCFA',
    conversionDirection: 'FCFA_TO_GNF',
    formula: `${formatCorrespondentAmount(inputAmount, 'FCFA')} / 5\u202f000 × ${formatNumber(rateValue)} = ${formatCorrespondentAmount(converted, 'GNF')}`,
  }
}

export function formatCorrespondentRate({
  rateBaseAmount = 5000,
  rateValue,
}: {
  rateBaseAmount?: number
  rateValue: number
}): string {
  return `Taux actuel : ${formatCorrespondentAmount(
    rateValue,
    'GNF',
  )} / ${formatCorrespondentAmount(rateBaseAmount, 'FCFA')}`
}

export function getCorrespondentVisibleIdentity(
  correspondent: Pick<CorrespondentSummary, 'email' | 'name'>,
): CorrespondentVisibleIdentity {
  const name = correspondent.name?.trim()
  const email = correspondent.email?.trim()
  const primary = name || email || 'Correspondant sans nom'
  const secondary = email && email !== primary ? email : null

  return { primary, secondary }
}

export function buildCorrespondentOverview({
  correspondents,
  transactions,
  withdrawals,
}: {
  correspondents: CorrespondentSummary[]
  transactions: CorrespondentTransaction[]
  withdrawals: CorrespondentWithdrawal[]
}): CorrespondentOverview {
  return {
    pendingTransactionCount: transactions.filter(
      (transaction) => transaction.status === 'pending',
    ).length,
    paidTransactionCount: transactions.filter(isPaidTransaction).length,
    canceledTransactionCount: transactions.filter(
      (transaction) => transaction.status === 'canceled',
    ).length,
    pendingWithdrawalCount: withdrawals.filter(
      (withdrawal) => withdrawal.status === 'pending',
    ).length,
    confirmedWithdrawalCount: withdrawals.filter(
      (withdrawal) => withdrawal.status === 'confirmed',
    ).length,
    canceledWithdrawalCount: withdrawals.filter(
      (withdrawal) => withdrawal.status === 'canceled',
    ).length,
    heldBalances: groupBalancesByCurrency(correspondents),
  }
}

export function getAutoSelectedCorrespondentId({
  correspondents,
  selectedCorrespondentId,
}: {
  correspondents: CorrespondentSummary[]
  selectedCorrespondentId?: string | null
}): string {
  const normalizedSelected = selectedCorrespondentId?.trim() ?? ''

  if (normalizedSelected) {
    return correspondents.some(
      (correspondent) => correspondent.membershipId === normalizedSelected,
    )
      ? normalizedSelected
      : ''
  }

  return correspondents.length === 1 ? correspondents[0].membershipId : ''
}

export function getWithdrawalWarning({
  amount,
  correspondent,
}: {
  amount: number | null
  correspondent: CorrespondentSummary | null
}): string | null {
  const availableBalance = correspondent
    ? getCorrespondentAvailableBalance(correspondent)
    : 0

  if (!amount || !correspondent || amount <= availableBalance) {
    return null
  }

  return `Solde disponible insuffisant : ${formatCorrespondentAmount(
    availableBalance,
    correspondent.currency,
  )} disponible.`
}

export function getCorrespondentErrorMessage(error: unknown): string {
  const errorCode = getErrorCode(error)

  if (errorCode && CORRESPONDENT_ERROR_MESSAGES[errorCode]) {
    return CORRESPONDENT_ERROR_MESSAGES[errorCode]
  }

  if (isConnectivityError(error)) {
    return 'Serveur indisponible. Vérifiez que l’API est démarrée et réessayez.'
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Une erreur est survenue. Réessayez.'
}

export function getCorrespondentById(
  correspondents: CorrespondentSummary[],
  membershipId: string | null | undefined,
): CorrespondentSummary | null {
  if (!membershipId) {
    return null
  }

  return (
    correspondents.find(
      (correspondent) => correspondent.membershipId === membershipId,
    ) ?? null
  )
}

function isManagerTab(value: string | null): value is CorrespondentManagerTab {
  return CORRESPONDENT_MANAGER_TABS.some((tab) => tab.value === value)
}

function isPartnerTab(value: string | null): value is CorrespondentPartnerTab {
  return CORRESPONDENT_PARTNER_TABS.some((tab) => tab.value === value)
}

function isPaidTransaction(transaction: CorrespondentTransaction): boolean {
  return transaction.status === 'paid' || transaction.status === 'confirmed'
}

function groupBalancesByCurrency(
  correspondents: CorrespondentSummary[],
): CurrencyBalanceSummary[] {
  const balances = new Map<CorrespondentCurrency, CurrencyBalanceSummary>()

  for (const correspondent of correspondents) {
    const current = balances.get(correspondent.currency) ?? {
      currency: correspondent.currency,
      balance: 0,
      reservedBalance: 0,
    }

    current.balance += correspondent.balance
    current.reservedBalance += correspondent.reservedBalance
    balances.set(correspondent.currency, current)
  }

  return [...balances.values()]
}

function getCorrespondentAvailableBalance(
  correspondent: CorrespondentSummary,
): number {
  return correspondent.balance - correspondent.reservedBalance
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('errorCode' in error)) {
    return null
  }

  const errorCode = (error as { errorCode?: unknown }).errorCode

  return typeof errorCode === 'string' ? errorCode : null
}

function isConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode

  if (statusCode === 0) {
    return true
  }

  return error instanceof Error && /network error/i.test(error.message)
}
