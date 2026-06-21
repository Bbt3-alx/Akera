import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { AppApiError } from '../../../shared/api/types.ts'
import { createIdempotencyKey } from '../../../shared/utils/idempotency.ts'
import { useMe } from '../../auth/hooks.ts'
import { useCompaniesStore } from '../../companies/store.ts'
import {
  useAddRemoteAgentGroupMember,
  useCancelRemoteAgentPayout,
  useCreateRemoteAgentGroup,
  useCreateRemoteAgentPayout,
  useLookupRemoteAgentPayout,
  usePayRemoteAgentPayout,
  useRecordRemoteAgentGroupDeposit,
  useRemoteAgentGroups,
  useRemoteAgentPayouts,
  useUpdateRemoteAgentGroup,
  useUpdateRemoteAgentGroupMember,
} from '../hooks.ts'
import type {
  RemoteAgentGroup,
  RemoteAgentGroupMember,
  RemoteAgentPayout,
  RemotePayoutPermission,
  RemotePayoutStatus,
} from '../types.ts'
import {
  buildCreatePayoutResult,
  buildRemoteAgentModuleModel,
  canSubmitBeneficiaryPayment,
  formatPermissionLabel,
  getAgentCapabilities,
  getGenericLookupErrorMessage,
  getMemberDisplayName,
} from '../viewModel.ts'

const PIN_PATTERN = /^\d{6}$/
const LIST_PARAMS = { page: 1, limit: 50 } as const
const REMOTE_PAYOUT_PERMISSIONS = [
  'remote_payout:view',
  'remote_payout:deposit',
  'remote_payout:pay',
  'remote_payout:manage_group',
] as const satisfies readonly RemotePayoutPermission[]
const MEMBER_ROLES = ['agent', 'supervisor'] as const
const MEMBER_STATUSES = ['active', 'inactive'] as const
const GROUP_STATUSES = ['active', 'inactive'] as const
const DEPOSIT_METHODS = ['cash', 'bank', 'mobile_money', 'other'] as const
const EMPTY_GROUPS: RemoteAgentGroup[] = []
const EMPTY_PAYOUTS: RemoteAgentPayout[] = []

const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Le nom du groupe est requis'),
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

const updateGroupSchema = z.object({
  name: z.string().trim().min(2, 'Le nom du groupe est requis'),
  status: z.enum(GROUP_STATUSES),
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

const addMemberSchema = z.object({
  membershipId: z.string().trim().min(1, 'Identifiant membre requis'),
  role: z.enum(MEMBER_ROLES),
  permissions: z.array(z.enum(REMOTE_PAYOUT_PERMISSIONS)).min(1),
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

const updateMemberSchema = z.object({
  role: z.enum(MEMBER_ROLES),
  permissions: z.array(z.enum(REMOTE_PAYOUT_PERMISSIONS)).min(1),
  status: z.enum(MEMBER_STATUSES),
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

const createPayoutSchema = z.object({
  assignedAgentGroupId: z.string().trim().min(1, 'Groupe requis'),
  amount: z
    .number({ error: 'Montant requis' })
    .refine(Number.isFinite, 'Montant invalide')
    .positive('Le montant doit être supérieur à 0'),
  beneficiaryName: z.string().trim().min(2, 'Nom bénéficiaire requis'),
  beneficiaryPhone: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional(),
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

const depositSchema = z.object({
  groupId: z.string().trim().min(1, 'Groupe requis'),
  amount: z
    .number({ error: 'Montant requis' })
    .refine(Number.isFinite, 'Montant invalide')
    .positive('Le montant doit être supérieur à 0'),
  method: z.enum(DEPOSIT_METHODS),
  reference: z.string().trim().max(100).optional(),
  note: z.string().trim().max(300).optional(),
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

const lookupSchema = z.object({
  beneficiaryCode: z.string().trim().min(4, 'Code bénéficiaire requis'),
})

const paySchema = z.object({
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

const cancelPayoutSchema = z.object({
  reason: z.string().trim().max(300).optional(),
  transactionPin: z.string().regex(PIN_PATTERN, 'PIN de transaction invalide'),
})

type CreateGroupFormValues = z.infer<typeof createGroupSchema>
type UpdateGroupFormValues = z.infer<typeof updateGroupSchema>
type AddMemberFormValues = z.infer<typeof addMemberSchema>
type UpdateMemberFormValues = z.infer<typeof updateMemberSchema>
type CreatePayoutFormValues = z.infer<typeof createPayoutSchema>
type DepositFormValues = z.infer<typeof depositSchema>
type LookupFormValues = z.infer<typeof lookupSchema>
type PayFormValues = z.infer<typeof paySchema>
type CancelPayoutFormValues = z.infer<typeof cancelPayoutSchema>
type ManagerTab = 'overview' | 'groups' | 'create-payout' | 'payouts'
type AgentTab = 'my-groups' | 'record-deposit' | 'pay-beneficiary' | 'history'

export function RemoteAgentPayoutPage() {
  const [managerTab, setManagerTab] = useState<ManagerTab>('overview')
  const [agentTab, setAgentTab] = useState<AgentTab>('my-groups')
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId)
  const meQuery = useMe()
  const activeMembership = meQuery.data?.memberships.find(
    (membership) =>
      membership.companyId === activeCompanyId &&
      membership.status === 'active',
  )
  const isManager = activeMembership?.role === 'manager'
  const isEmployee = activeMembership?.role === 'employee'
  const groupsQuery = useRemoteAgentGroups(
    LIST_PARAMS,
    Boolean(isManager || isEmployee),
  )
  const payoutsQuery = useRemoteAgentPayouts(
    LIST_PARAMS,
    Boolean(isManager || isEmployee),
  )
  const groups = groupsQuery.data?.data ?? EMPTY_GROUPS
  const payouts = payoutsQuery.data?.data ?? EMPTY_PAYOUTS
  const model = useMemo(
    () =>
      buildRemoteAgentModuleModel({
        activeMembershipId: activeMembership?.membershipId,
        groups,
        payouts,
        role: activeMembership?.role,
      }),
    [activeMembership?.membershipId, activeMembership?.role, groups, payouts],
  )
  const capabilities = useMemo(
    () => getAgentCapabilities(groups, activeMembership?.membershipId),
    [activeMembership?.membershipId, groups],
  )
  const isCheckingAccess = Boolean(activeCompanyId) && meQuery.isLoading

  if (isCheckingAccess) {
    return (
      <StateMessage title="Vérification de l'accès">
        Confirmation du contexte société actif.
      </StateMessage>
    )
  }

  if (meQuery.isError) {
    return (
      <StateMessage title="Accès impossible">
        {getErrorMessage(meQuery.error)}
      </StateMessage>
    )
  }

  if (!activeCompanyId || !activeMembership) {
    return (
      <StateMessage title="Aucune société active">
        Sélectionnez une société active avant d'utiliser les paiements agents.
      </StateMessage>
    )
  }

  if (!isManager && !isEmployee) {
    return (
      <StateMessage title="Paiements agents indisponibles">
        Ce module est réservé aux managers et employés autorisés.
      </StateMessage>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader />

      {isManager ? (
        <ManagerView
          activeTab={managerTab}
          groups={groups}
          groupsError={groupsQuery.error}
          isGroupsLoading={groupsQuery.isLoading}
          isPayoutsLoading={payoutsQuery.isLoading}
          model={model}
          onRefreshGroups={() => void groupsQuery.refetch()}
          onRefreshPayouts={() => void payoutsQuery.refetch()}
          onTabChange={setManagerTab}
          payouts={payouts}
          payoutsError={payoutsQuery.error}
        />
      ) : null}

      {isEmployee ? (
        <AgentView
          activeMembershipId={activeMembership.membershipId}
          activeTab={agentTab}
          capabilities={capabilities}
          groupFetchError={groupsQuery.error}
          groups={model.activeAgentGroups}
          isGroupsLoading={groupsQuery.isLoading}
          isPayoutsLoading={payoutsQuery.isLoading}
          onRefreshGroups={() => void groupsQuery.refetch()}
          onRefreshPayouts={() => void payoutsQuery.refetch()}
          onTabChange={setAgentTab}
          payouts={payouts}
          payoutsError={payoutsQuery.error}
        />
      ) : null}
    </section>
  )
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-950">
        Paiements agents
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Gérez les groupes d'agents, les dépôts de caisse et le paiement sécurisé
        des bénéficiaires par code.
      </p>
    </div>
  )
}

type ManagerViewProps = {
  activeTab: ManagerTab
  groups: RemoteAgentGroup[]
  groupsError: unknown
  isGroupsLoading: boolean
  isPayoutsLoading: boolean
  model: ReturnType<typeof buildRemoteAgentModuleModel>
  onRefreshGroups: () => void
  onRefreshPayouts: () => void
  onTabChange: (tab: ManagerTab) => void
  payouts: RemoteAgentPayout[]
  payoutsError: unknown
}

function ManagerView({
  activeTab,
  groups,
  groupsError,
  isGroupsLoading,
  isPayoutsLoading,
  model,
  onRefreshGroups,
  onRefreshPayouts,
  onTabChange,
  payouts,
  payoutsError,
}: ManagerViewProps) {
  return (
    <div className="space-y-4">
      <TabList
        activeTab={activeTab}
        onTabChange={(tab) => onTabChange(tab as ManagerTab)}
        tabs={[
          { label: 'Vue d’ensemble', value: 'overview' },
          { label: 'Groupes d’agents', value: 'groups' },
          { label: 'Créer un paiement', value: 'create-payout' },
          { label: 'Paiements', value: 'payouts' },
        ]}
      />

      {activeTab === 'overview' ? (
        <OverviewSection
          isLoading={isGroupsLoading || isPayoutsLoading}
          overview={model.overview}
        />
      ) : null}

      {activeTab === 'groups' ? (
        <ManagerGroupsSection
          error={groupsError}
          groups={groups}
          isLoading={isGroupsLoading}
          onRefresh={onRefreshGroups}
        />
      ) : null}

      {activeTab === 'create-payout' ? (
        <CreatePayoutSection groups={groups} />
      ) : null}

      {activeTab === 'payouts' ? (
        <PayoutsSection
          error={payoutsError}
          groups={groups}
          isLoading={isPayoutsLoading}
          managerMode
          onRefresh={onRefreshPayouts}
          payouts={payouts}
        />
      ) : null}
    </div>
  )
}

type AgentViewProps = {
  activeMembershipId: string
  activeTab: AgentTab
  capabilities: ReturnType<typeof getAgentCapabilities>
  groupFetchError: unknown
  groups: RemoteAgentGroup[]
  isGroupsLoading: boolean
  isPayoutsLoading: boolean
  onRefreshGroups: () => void
  onRefreshPayouts: () => void
  onTabChange: (tab: AgentTab) => void
  payouts: RemoteAgentPayout[]
  payoutsError: unknown
}

function AgentView({
  activeMembershipId,
  activeTab,
  capabilities,
  groupFetchError,
  groups,
  isGroupsLoading,
  isPayoutsLoading,
  onRefreshGroups,
  onRefreshPayouts,
  onTabChange,
  payouts,
  payoutsError,
}: AgentViewProps) {
  return (
    <div className="space-y-4">
      <TabList
        activeTab={activeTab}
        onTabChange={(tab) => onTabChange(tab as AgentTab)}
        tabs={[
          { label: 'Mes groupes', value: 'my-groups' },
          { label: 'Enregistrer un dépôt', value: 'record-deposit' },
          { label: 'Payer un bénéficiaire', value: 'pay-beneficiary' },
          { label: 'Historique', value: 'history' },
        ]}
      />

      {activeTab === 'my-groups' ? (
        <AgentGroupsSection
          activeMembershipId={activeMembershipId}
          error={groupFetchError}
          groups={groups}
          isLoading={isGroupsLoading}
          onRefresh={onRefreshGroups}
        />
      ) : null}

      {activeTab === 'record-deposit' ? (
        <RecordDepositSection
          capabilities={capabilities}
          groupFetchError={groupFetchError}
          isGroupsLoading={isGroupsLoading}
        />
      ) : null}

      {activeTab === 'pay-beneficiary' ? (
        <PayBeneficiarySection
          capabilities={capabilities}
          groupFetchError={groupFetchError}
          groups={groups}
          isGroupsLoading={isGroupsLoading}
        />
      ) : null}

      {activeTab === 'history' ? (
        <PayoutsSection
          error={payoutsError}
          groups={groups}
          isLoading={isPayoutsLoading}
          managerMode={false}
          onRefresh={onRefreshPayouts}
          payouts={payouts}
        />
      ) : null}
    </div>
  )
}

type OverviewSectionProps = {
  isLoading: boolean
  overview: ReturnType<typeof buildRemoteAgentModuleModel>['overview']
}

function OverviewSection({ isLoading, overview }: OverviewSectionProps) {
  if (isLoading) {
    return (
      <StateMessage title="Chargement">
        Calcul des soldes des groupes d'agents.
      </StateMessage>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        label="Caisse du groupe"
        value={formatMoney(overview.totalBalance)}
      />
      <MetricCard
        label="Solde réservé"
        value={formatMoney(overview.totalReservedBalance)}
      />
      <MetricCard
        label="Solde disponible"
        value={formatMoney(overview.totalAvailableBalance)}
      />
      <MetricCard
        label="Groupes actifs"
        value={String(overview.activeGroupCount)}
      />
      <MetricCard
        label="Paiements en attente"
        value={String(overview.pendingPayoutCount)}
      />
    </div>
  )
}

type ManagerGroupsSectionProps = {
  error: unknown
  groups: RemoteAgentGroup[]
  isLoading: boolean
  onRefresh: () => void
}

function ManagerGroupsSection({
  error,
  groups,
  isLoading,
  onRefresh,
}: ManagerGroupsSectionProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <div className="space-y-4">
        <Panel
          action={
            <button
              className="h-9 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              disabled={isLoading}
              onClick={onRefresh}
              type="button"
            >
              Actualiser
            </button>
          }
          title="Groupes d’agents"
        >
          {isLoading ? (
            <InlineState title="Chargement">
              Chargement des groupes d'agents.
            </InlineState>
          ) : null}

          {error ? (
            <InlineState title="Chargement impossible">
              {getErrorMessage(error)}
            </InlineState>
          ) : null}

          {!isLoading && !error && groups.length === 0 ? (
            <InlineState title="Aucun groupe">
              Créez un premier groupe pour démarrer la caisse agent.
            </InlineState>
          ) : null}

          {!isLoading && !error && groups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Groupe</th>
                    <th className="px-4 py-3">Caisse du groupe</th>
                    <th className="px-4 py-3">Solde réservé</th>
                    <th className="px-4 py-3">Solde disponible</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Membres</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((group) => (
                    <tr key={group.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                        {group.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatMoney(group.balance, group.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatMoney(group.reservedBalance, group.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatMoney(group.availableBalance, group.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={group.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {group.members.length}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          className="h-8 rounded border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                          onClick={() => setSelectedGroupId(group.id)}
                          type="button"
                        >
                          Voir / modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>

        <CreateGroupForm />
      </div>

      <GroupDetailPanel group={selectedGroup} />
    </div>
  )
}

function CreateGroupForm() {
  const createGroup = useCreateRemoteAgentGroup()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      transactionPin: '',
    },
  })
  const isSaving = isSubmitting || createGroup.isPending

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)
    createGroup.reset()

    try {
      const group = await createGroup.mutateAsync({
        name: values.name.trim(),
        transactionPin: values.transactionPin,
      })

      setSuccessMessage(`Groupe ${group.name} créé.`)
      reset({ name: '', transactionPin: '' })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  return (
    <Panel title="Créer un groupe">
      <form className="space-y-4" onSubmit={onSubmit}>
        <FormField
          error={errors.name?.message}
          label="Nom du groupe"
          registration={register('name')}
        />
        <InfoBox>
          Ajout initial de membres : aucun sélecteur employé n'est disponible
          dans le frontend actuel. Créez le groupe, puis ajoutez un membre par
          identifiant de membership.
        </InfoBox>
        <FormField
          autoComplete="off"
          error={errors.transactionPin?.message}
          inputMode="numeric"
          label="PIN de transaction"
          registration={register('transactionPin')}
          type="password"
        />
        <MutationMessage error={createGroup.error} success={successMessage} />
        <PrimaryButton disabled={isSaving}>
          {isSaving ? 'Création' : 'Créer le groupe'}
        </PrimaryButton>
      </form>
    </Panel>
  )
}

function GroupDetailPanel({ group }: { group: RemoteAgentGroup | null }) {
  const [editingMember, setEditingMember] =
    useState<RemoteAgentGroupMember | null>(null)

  if (!group) {
    return (
      <Panel title="Détail groupe">
        <InlineState title="Aucun groupe sélectionné">
          Sélectionnez un groupe pour voir ses membres.
        </InlineState>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      <Panel title={group.name}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail label="Caisse du groupe" value={formatMoney(group.balance)} />
          <Detail
            label="Solde réservé"
            value={formatMoney(group.reservedBalance)}
          />
          <Detail
            label="Solde disponible"
            value={formatMoney(group.availableBalance)}
          />
          <Detail label="Statut" value={formatStatus(group.status)} />
        </dl>
      </Panel>

      <UpdateGroupForm group={group} key={group.id} />
      <AddMemberForm groupId={group.id} />

      <Panel title="Membres">
        {group.members.length === 0 ? (
          <InlineState title="Aucun membre">
            Ajoutez un employé autorisé à ce groupe.
          </InlineState>
        ) : (
          <div className="space-y-3">
            {group.members.map((member) => (
              <div
                className="rounded border border-slate-200 bg-slate-50 p-3"
                key={member.membership}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-950">
                      {getMemberDisplayName(member)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {member.agentEmail ?? 'Email non disponible'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ajouté le {formatDate(member.joinedAt)}
                    </p>
                  </div>
                  <button
                    className="h-8 rounded border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-white"
                    onClick={() => setEditingMember(member)}
                    type="button"
                  >
                    Modifier
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{formatRole(member.role)}</Badge>
                  <StatusBadge status={member.status} />
                  {member.permissions.map((permission) => (
                    <Badge key={permission}>
                      {formatPermissionLabel(permission)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {editingMember ? (
        <UpdateMemberForm
          groupId={group.id}
          key={`${group.id}-${editingMember.membership}`}
          member={editingMember}
          onClose={() => setEditingMember(null)}
        />
      ) : null}
    </div>
  )
}

function UpdateGroupForm({ group }: { group: RemoteAgentGroup }) {
  const updateGroup = useUpdateRemoteAgentGroup()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<UpdateGroupFormValues>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      name: group.name,
      status: group.status,
      transactionPin: '',
    },
  })
  const isSaving = isSubmitting || updateGroup.isPending

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)
    updateGroup.reset()

    try {
      await updateGroup.mutateAsync({
        groupId: group.id,
        payload: {
          name: values.name.trim(),
          status: values.status,
          transactionPin: values.transactionPin,
        },
      })

      setSuccessMessage('Groupe mis à jour.')
      reset({ ...values, transactionPin: '' })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  return (
    <Panel title="Modifier le groupe">
      <form className="space-y-4" onSubmit={onSubmit}>
        <FormField
          error={errors.name?.message}
          label="Nom du groupe"
          registration={register('name')}
        />
        <SelectField
          error={errors.status?.message}
          label="Statut"
          options={GROUP_STATUSES}
          registration={register('status')}
        />
        <FormField
          autoComplete="off"
          error={errors.transactionPin?.message}
          inputMode="numeric"
          label="PIN de transaction"
          registration={register('transactionPin')}
          type="password"
        />
        <MutationMessage error={updateGroup.error} success={successMessage} />
        <PrimaryButton disabled={isSaving}>
          {isSaving ? 'Mise à jour' : 'Mettre à jour'}
        </PrimaryButton>
      </form>
    </Panel>
  )
}

function AddMemberForm({ groupId }: { groupId: string }) {
  const addMember = useAddRemoteAgentGroupMember()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      membershipId: '',
      role: 'agent',
      permissions: ['remote_payout:view'],
      transactionPin: '',
    },
  })
  const isSaving = isSubmitting || addMember.isPending

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)
    addMember.reset()

    try {
      await addMember.mutateAsync({
        groupId,
        payload: {
          membershipId: values.membershipId.trim(),
          role: values.role,
          permissions: values.permissions,
          transactionPin: values.transactionPin,
        },
      })

      setSuccessMessage('Membre ajouté au groupe.')
      reset({
        membershipId: '',
        role: 'agent',
        permissions: ['remote_payout:view'],
        transactionPin: '',
      })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  return (
    <Panel title="Ajouter un membre">
      <form className="space-y-4" onSubmit={onSubmit}>
        <InfoBox>
          MVP : saisissez l'identifiant de membership employé. Un sélecteur
          employé pourra remplacer ce champ quand l'endpoint de recherche sera
          disponible.
        </InfoBox>
        <FormField
          error={errors.membershipId?.message}
          label="Identifiant membership"
          registration={register('membershipId')}
        />
        <SelectField
          error={errors.role?.message}
          label="Rôle"
          options={MEMBER_ROLES}
          registration={register('role')}
        />
        <PermissionCheckboxes
          error={errors.permissions?.message}
          registration={register('permissions')}
        />
        <FormField
          autoComplete="off"
          error={errors.transactionPin?.message}
          inputMode="numeric"
          label="PIN de transaction"
          registration={register('transactionPin')}
          type="password"
        />
        <MutationMessage error={addMember.error} success={successMessage} />
        <PrimaryButton disabled={isSaving}>
          {isSaving ? 'Ajout' : 'Ajouter le membre'}
        </PrimaryButton>
      </form>
    </Panel>
  )
}

type UpdateMemberFormProps = {
  groupId: string
  member: RemoteAgentGroupMember
  onClose: () => void
}

function UpdateMemberForm({ groupId, member, onClose }: UpdateMemberFormProps) {
  const updateMember = useUpdateRemoteAgentGroupMember()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<UpdateMemberFormValues>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      role: member.role,
      permissions: member.permissions,
      status: member.status,
      transactionPin: '',
    },
  })
  const isSaving = isSubmitting || updateMember.isPending

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)
    updateMember.reset()

    try {
      await updateMember.mutateAsync({
        groupId,
        membershipId: member.membership,
        payload: {
          role: values.role,
          permissions: values.permissions,
          status: values.status,
          transactionPin: values.transactionPin,
        },
      })

      setSuccessMessage('Membre mis à jour.')
      reset({ ...values, transactionPin: '' })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  return (
    <Panel
      action={
        <button
          className="h-8 rounded border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          onClick={onClose}
          type="button"
        >
          Fermer
        </button>
      }
      title={`Modifier ${getMemberDisplayName(member)}`}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <SelectField
          error={errors.role?.message}
          label="Rôle"
          options={MEMBER_ROLES}
          registration={register('role')}
        />
        <SelectField
          error={errors.status?.message}
          label="Statut"
          options={MEMBER_STATUSES}
          registration={register('status')}
        />
        <PermissionCheckboxes
          error={errors.permissions?.message}
          registration={register('permissions')}
        />
        <FormField
          autoComplete="off"
          error={errors.transactionPin?.message}
          inputMode="numeric"
          label="PIN de transaction"
          registration={register('transactionPin')}
          type="password"
        />
        <MutationMessage error={updateMember.error} success={successMessage} />
        <PrimaryButton disabled={isSaving}>
          {isSaving ? 'Mise à jour' : 'Mettre à jour le membre'}
        </PrimaryButton>
      </form>
    </Panel>
  )
}

function CreatePayoutSection({ groups }: { groups: RemoteAgentGroup[] }) {
  const createPayout = useCreateRemoteAgentPayout()
  const [secureResult, setSecureResult] = useState<ReturnType<
    typeof buildCreatePayoutResult
  > | null>(null)
  const [copied, setCopied] = useState(false)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<CreatePayoutFormValues>({
    resolver: zodResolver(createPayoutSchema),
    defaultValues: {
      assignedAgentGroupId: '',
      amount: undefined,
      beneficiaryName: '',
      beneficiaryPhone: '',
      note: '',
      transactionPin: '',
    },
  })
  const activeGroups = groups.filter((group) => group.status === 'active')
  const isSaving = isSubmitting || createPayout.isPending

  const onSubmit = handleSubmit(async (values) => {
    setSecureResult(null)
    setCopied(false)
    createPayout.reset()

    try {
      const response = await createPayout.mutateAsync({
        assignedAgentGroupId: values.assignedAgentGroupId,
        amount: values.amount,
        currency: 'FCFA',
        beneficiaryName: values.beneficiaryName.trim(),
        beneficiaryPhone: toOptionalString(values.beneficiaryPhone),
        note: toOptionalString(values.note),
        transactionPin: values.transactionPin,
        idempotencyKey: createIdempotencyKey('remote-payout'),
      })

      setSecureResult(buildCreatePayoutResult(response))
      reset({
        assignedAgentGroupId: '',
        amount: undefined,
        beneficiaryName: '',
        beneficiaryPhone: '',
        note: '',
        transactionPin: '',
      })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  async function handleCopyCode() {
    if (!secureResult?.beneficiaryCode) {
      return
    }

    await navigator.clipboard?.writeText(secureResult.beneficiaryCode)
    setCopied(true)
  }

  return (
    <Panel title="Créer un paiement">
      <form className="max-w-2xl space-y-4" onSubmit={onSubmit}>
        <SelectField
          error={errors.assignedAgentGroupId?.message}
          label="Groupe d’agents"
          options={activeGroups.map((group) => ({
            label: `${group.name} - ${formatMoney(group.availableBalance)}`,
            value: group.id,
          }))}
          placeholder="Sélectionner un groupe"
          registration={register('assignedAgentGroupId')}
        />
        <FormField
          error={errors.amount?.message}
          inputMode="decimal"
          label="Montant FCFA"
          registration={register('amount', { setValueAs: toOptionalNumber })}
          type="number"
        />
        <FormField
          error={errors.beneficiaryName?.message}
          label="Nom bénéficiaire"
          registration={register('beneficiaryName')}
        />
        <FormField
          error={errors.beneficiaryPhone?.message}
          label="Téléphone bénéficiaire (optionnel)"
          registration={register('beneficiaryPhone')}
        />
        <TextAreaField
          error={errors.note?.message}
          label="Note (optionnel)"
          registration={register('note')}
        />
        <FormField
          autoComplete="off"
          error={errors.transactionPin?.message}
          inputMode="numeric"
          label="PIN de transaction"
          registration={register('transactionPin')}
          type="password"
        />
        <MutationMessage error={createPayout.error} />
        {secureResult ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">
              Référence paiement : {secureResult.payoutCode}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Code bénéficiaire
            </p>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="rounded bg-white px-3 py-2 text-lg font-semibold text-slate-950 ring-1 ring-emerald-200">
                {secureResult.beneficiaryCode}
              </code>
              <button
                className="h-9 rounded bg-emerald-700 px-3 text-sm font-medium text-white transition hover:bg-emerald-800"
                onClick={() => void handleCopyCode()}
                type="button"
              >
                {copied ? 'Copié' : 'Copier'}
              </button>
              <button
                className="h-9 rounded border border-emerald-300 px-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
                onClick={() => setSecureResult(null)}
                type="button"
              >
                J'ai partagé ce code
              </button>
            </div>
            <p className="mt-3 font-medium">
              {secureResult.warning} Partagez-le avec le bénéficiaire de façon
              sécurisée.
            </p>
          </div>
        ) : null}
        <PrimaryButton disabled={isSaving || activeGroups.length === 0}>
          {isSaving ? 'Création' : 'Créer le paiement'}
        </PrimaryButton>
      </form>
    </Panel>
  )
}

type PayoutsSectionProps = {
  error: unknown
  groups: RemoteAgentGroup[]
  isLoading: boolean
  managerMode: boolean
  onRefresh: () => void
  payouts: RemoteAgentPayout[]
}

function PayoutsSection({
  error,
  groups,
  isLoading,
  managerMode,
  onRefresh,
  payouts,
}: PayoutsSectionProps) {
  const [cancelingPayoutCode, setCancelingPayoutCode] = useState<string | null>(
    null,
  )
  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  )
  const memberNames = useMemo(() => buildMemberNameMap(groups), [groups])

  return (
    <Panel
      action={
        <button
          className="h-9 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          disabled={isLoading}
          onClick={onRefresh}
          type="button"
        >
          Actualiser
        </button>
      }
      title={managerMode ? 'Paiements' : 'Historique'}
    >
      {isLoading ? (
        <InlineState title="Chargement">
          Chargement des paiements agents.
        </InlineState>
      ) : null}

      {error ? (
        <InlineState title="Historique indisponible">
          {isAccessDenied(error)
            ? "L'historique complet dépend des permissions exposées par l'API. TODO : affiner l'historique agent si l'endpoint ne retourne pas les paiements pertinents."
            : getErrorMessage(error)}
        </InlineState>
      ) : null}

      {!isLoading && !error && payouts.length === 0 ? (
        <InlineState title="Aucun paiement">
          Les paiements récents apparaîtront ici.
        </InlineState>
      ) : null}

      {!isLoading && !error && payouts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Référence paiement</th>
                <th className="px-4 py-3">Bénéficiaire</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Groupe</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Payé par</th>
                <th className="px-4 py-3">Dates</th>
                {managerMode ? <th className="px-4 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map((payout) => (
                <tr key={payout.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                    {payout.payoutCode}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {payout.beneficiaryName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatMoney(payout.amount, payout.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {groupNames.get(payout.assignedAgentGroup) ??
                      'Groupe non chargé'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={payout.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    ****{payout.beneficiaryCodeLast4}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {payout.paidByMembership
                      ? memberNames.get(payout.paidByMembership) ?? 'Agent payé'
                      : '—'}
                  </td>
                  <td className="min-w-48 px-4 py-3 text-slate-600">
                    <p>Créé : {formatDate(payout.createdAt)}</p>
                    {payout.paidAt ? <p>Payé : {formatDate(payout.paidAt)}</p> : null}
                    {payout.canceledAt ? (
                      <p>Annulé : {formatDate(payout.canceledAt)}</p>
                    ) : null}
                  </td>
                  {managerMode ? (
                    <td className="min-w-56 px-4 py-3">
                      {payout.status === 'pending' ? (
                        cancelingPayoutCode === payout.payoutCode ? (
                          <CancelPayoutForm
                            onCancel={() => setCancelingPayoutCode(null)}
                            payoutCode={payout.payoutCode}
                          />
                        ) : (
                          <button
                            className="h-8 rounded border border-red-300 px-3 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            onClick={() =>
                              setCancelingPayoutCode(payout.payoutCode)
                            }
                            type="button"
                          >
                            Annuler
                          </button>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  )
}

function CancelPayoutForm({
  onCancel,
  payoutCode,
}: {
  onCancel: () => void
  payoutCode: string
}) {
  const cancelPayout = useCancelRemoteAgentPayout()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<CancelPayoutFormValues>({
    resolver: zodResolver(cancelPayoutSchema),
    defaultValues: { reason: '', transactionPin: '' },
  })
  const isSaving = isSubmitting || cancelPayout.isPending

  const onSubmit = handleSubmit(async (values) => {
    if (!window.confirm('Confirmer l’annulation de ce paiement ?')) {
      return
    }

    setSuccessMessage(null)
    cancelPayout.reset()

    try {
      await cancelPayout.mutateAsync({
        payoutCode,
        payload: {
          reason: toOptionalString(values.reason),
          transactionPin: values.transactionPin,
        },
      })

      setSuccessMessage('Paiement annulé.')
      reset({ reason: '', transactionPin: '' })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      <FormField
        error={errors.reason?.message}
        label="Motif"
        registration={register('reason')}
      />
      <FormField
        autoComplete="off"
        error={errors.transactionPin?.message}
        inputMode="numeric"
        label="PIN"
        registration={register('transactionPin')}
        type="password"
      />
      <MutationMessage error={cancelPayout.error} success={successMessage} />
      <div className="flex gap-2">
        <PrimaryButton disabled={isSaving} size="sm">
          {isSaving ? 'Annulation' : 'Confirmer'}
        </PrimaryButton>
        <button
          className="h-8 rounded border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          onClick={onCancel}
          type="button"
        >
          Fermer
        </button>
      </div>
    </form>
  )
}

type AgentGroupsSectionProps = {
  activeMembershipId: string
  error: unknown
  groups: RemoteAgentGroup[]
  isLoading: boolean
  onRefresh: () => void
}

function AgentGroupsSection({
  activeMembershipId,
  error,
  groups,
  isLoading,
  onRefresh,
}: AgentGroupsSectionProps) {
  return (
    <Panel
      action={
        <button
          className="h-9 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          disabled={isLoading}
          onClick={onRefresh}
          type="button"
        >
          Actualiser
        </button>
      }
      title="Mes groupes"
    >
      {isLoading ? (
        <InlineState title="Chargement">
          Chargement de vos groupes actifs.
        </InlineState>
      ) : null}
      {error ? <AgentGroupsUnavailable error={error} /> : null}
      {!isLoading && !error && groups.length === 0 ? (
        <InlineState title="Aucun groupe actif">
          Aucun groupe d'agents actif n'est disponible pour ce compte.
        </InlineState>
      ) : null}
      {!isLoading && !error && groups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const member = group.members.find(
              (entry) => entry.membership === activeMembershipId,
            )

            return (
              <div
                className="rounded border border-slate-200 bg-slate-50 p-4"
                key={group.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-950">
                      {group.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Solde disponible :{' '}
                      {formatMoney(group.availableBalance, group.currency)}
                    </p>
                  </div>
                  <StatusBadge status={group.status} />
                </div>
                {member ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{formatRole(member.role)}</Badge>
                    {member.permissions.map((permission) => (
                      <Badge key={permission}>
                        {formatPermissionLabel(permission)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </Panel>
  )
}

function RecordDepositSection({
  capabilities,
  groupFetchError,
  isGroupsLoading,
}: {
  capabilities: ReturnType<typeof getAgentCapabilities>
  groupFetchError: unknown
  isGroupsLoading: boolean
}) {
  if (isGroupsLoading) {
    return (
      <StateMessage title="Chargement">
        Vérification des permissions de dépôt.
      </StateMessage>
    )
  }

  if (groupFetchError) {
    return <AgentGroupsUnavailable error={groupFetchError} />
  }

  if (!capabilities.canDeposit) {
    return (
      <StateMessage title="Dépôt indisponible">
        Votre membership actif n'a pas la permission Dépôt dans un groupe actif.
      </StateMessage>
    )
  }

  return <RecordDepositForm groups={capabilities.depositGroups} />
}

function RecordDepositForm({ groups }: { groups: RemoteAgentGroup[] }) {
  const recordDeposit = useRecordRemoteAgentGroupDeposit()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      groupId: '',
      amount: undefined,
      method: 'cash',
      reference: '',
      note: '',
      transactionPin: '',
    },
  })
  const isSaving = isSubmitting || recordDeposit.isPending

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null)
    recordDeposit.reset()

    try {
      const deposit = await recordDeposit.mutateAsync({
        groupId: values.groupId,
        payload: {
          amount: values.amount,
          currency: 'FCFA',
          method: values.method,
          reference: toOptionalString(values.reference),
          note: toOptionalString(values.note),
          transactionPin: values.transactionPin,
          idempotencyKey: createIdempotencyKey('agent-deposit'),
        },
      })

      setSuccessMessage(
        `Dépôt enregistré${deposit.operationCode ? ` (${deposit.operationCode})` : ''}.`,
      )
      reset({
        groupId: '',
        amount: undefined,
        method: 'cash',
        reference: '',
        note: '',
        transactionPin: '',
      })
    } catch {
      return
    } finally {
      setValue('transactionPin', '')
    }
  })

  return (
    <Panel title="Enregistrer un dépôt">
      <form className="max-w-2xl space-y-4" onSubmit={onSubmit}>
        <SelectField
          error={errors.groupId?.message}
          label="Groupe"
          options={groups.map((group) => ({ label: group.name, value: group.id }))}
          placeholder="Sélectionner un groupe"
          registration={register('groupId')}
        />
        <FormField
          error={errors.amount?.message}
          inputMode="decimal"
          label="Montant FCFA"
          registration={register('amount', { setValueAs: toOptionalNumber })}
          type="number"
        />
        <SelectField
          error={errors.method?.message}
          label="Méthode"
          options={DEPOSIT_METHODS}
          registration={register('method')}
        />
        <FormField
          error={errors.reference?.message}
          label="Référence (optionnel)"
          registration={register('reference')}
        />
        <TextAreaField
          error={errors.note?.message}
          label="Note (optionnel)"
          registration={register('note')}
        />
        <FormField
          autoComplete="off"
          error={errors.transactionPin?.message}
          inputMode="numeric"
          label="PIN de transaction"
          registration={register('transactionPin')}
          type="password"
        />
        <MutationMessage error={recordDeposit.error} success={successMessage} />
        <PrimaryButton disabled={isSaving}>
          {isSaving ? 'Enregistrement' : 'Enregistrer le dépôt'}
        </PrimaryButton>
      </form>
    </Panel>
  )
}

function PayBeneficiarySection({
  capabilities,
  groupFetchError,
  groups,
  isGroupsLoading,
}: {
  capabilities: ReturnType<typeof getAgentCapabilities>
  groupFetchError: unknown
  groups: RemoteAgentGroup[]
  isGroupsLoading: boolean
}) {
  if (isGroupsLoading) {
    return (
      <StateMessage title="Chargement">
        Vérification des permissions de paiement.
      </StateMessage>
    )
  }

  const canUseBackendVerifiedLookup = isAccessDenied(groupFetchError)

  if (groupFetchError && !canUseBackendVerifiedLookup) {
    return <AgentGroupsUnavailable error={groupFetchError} />
  }

  if (!capabilities.canPay && !canUseBackendVerifiedLookup) {
    return (
      <StateMessage title="Paiement indisponible">
        Votre membership actif n'a pas la permission Paiement dans un groupe
        actif.
      </StateMessage>
    )
  }

  return (
    <PayBeneficiaryForm
      groups={groups}
      permissionNote={
        canUseBackendVerifiedLookup
          ? "L'API ne liste pas encore vos groupes côté agent. La permission de paiement sera vérifiée lors de la recherche du code."
          : undefined
      }
    />
  )
}

function PayBeneficiaryForm({
  groups,
  permissionNote,
}: {
  groups: RemoteAgentGroup[]
  permissionNote?: string
}) {
  const lookupPayout = useLookupRemoteAgentPayout()
  const payPayout = usePayRemoteAgentPayout()
  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  )
  const [beneficiaryCode, setBeneficiaryCode] = useState('')
  const [lookupResult, setLookupResult] = useState<RemoteAgentPayout | null>(
    null,
  )
  const [paymentResult, setPaymentResult] = useState<RemoteAgentPayout | null>(
    null,
  )
  const lookupForm = useForm<LookupFormValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { beneficiaryCode: '' },
  })
  const payForm = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: { transactionPin: '' },
  })

  const onLookup = lookupForm.handleSubmit(async (values) => {
    setLookupResult(null)
    setPaymentResult(null)
    setBeneficiaryCode(values.beneficiaryCode.trim())
    lookupPayout.reset()

    try {
      const payout = await lookupPayout.mutateAsync({
        beneficiaryCode: values.beneficiaryCode.trim(),
      })

      setLookupResult(payout)
    } catch {
      return
    }
  })

  const onPay = payForm.handleSubmit(async (values) => {
    const payoutToPay = lookupResult

    if (
      !canSubmitBeneficiaryPayment({
        beneficiaryCode,
        lookupPayout: payoutToPay,
        transactionPin: values.transactionPin,
      }) ||
      !payoutToPay
    ) {
      return
    }

    if (!window.confirm('Confirmer le paiement du bénéficiaire ?')) {
      return
    }

    payPayout.reset()

    try {
      const payout = await payPayout.mutateAsync({
        payoutCode: payoutToPay.payoutCode,
        payload: {
          beneficiaryCode,
          transactionPin: values.transactionPin,
          paymentIdempotencyKey: createIdempotencyKey('agent-pay'),
        },
      })

      setPaymentResult(payout)
      setLookupResult(null)
      setBeneficiaryCode('')
      lookupForm.reset({ beneficiaryCode: '' })
      payForm.reset({ transactionPin: '' })
    } catch {
      return
    } finally {
      payForm.setValue('transactionPin', '')
    }
  })

  return (
    <Panel title="Payer un bénéficiaire">
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-4" onSubmit={onLookup}>
          <h2 className="text-base font-semibold text-slate-950">
            Étape 1 : recherche
          </h2>
          {permissionNote ? <InfoBox>{permissionNote}</InfoBox> : null}
          <FormField
            error={lookupForm.formState.errors.beneficiaryCode?.message}
            label="Code bénéficiaire"
            registration={lookupForm.register('beneficiaryCode')}
          />
          {lookupPayout.isError ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {getGenericLookupErrorMessage()}
            </p>
          ) : null}
          <PrimaryButton
            disabled={lookupForm.formState.isSubmitting || lookupPayout.isPending}
          >
            {lookupPayout.isPending ? 'Recherche' : 'Rechercher'}
          </PrimaryButton>
        </form>

        <form className="space-y-4" onSubmit={onPay}>
          <h2 className="text-base font-semibold text-slate-950">
            Étape 2 : paiement
          </h2>
          {lookupResult ? (
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <Detail
                label="Bénéficiaire"
                value={lookupResult.beneficiaryName}
              />
              <Detail
                label="Montant"
                value={formatMoney(lookupResult.amount, lookupResult.currency)}
              />
              <Detail
                label="Référence paiement"
                value={lookupResult.payoutCode}
              />
              <Detail
                label="Groupe"
                value={
                  groupNames.get(lookupResult.assignedAgentGroup) ??
                  'Groupe autorisé'
                }
              />
            </div>
          ) : (
            <InfoBox>
              Recherchez un code valide avant de confirmer le paiement.
            </InfoBox>
          )}
          <FormField
            autoComplete="off"
            error={payForm.formState.errors.transactionPin?.message}
            inputMode="numeric"
            label="PIN de transaction"
            registration={payForm.register('transactionPin')}
            type="password"
          />
          <MutationMessage
            error={payPayout.error}
            success={
              paymentResult
                ? `Paiement ${paymentResult.payoutCode} payé.`
                : null
            }
          />
          <PrimaryButton
            disabled={
              payForm.formState.isSubmitting ||
              payPayout.isPending ||
              !lookupResult
            }
          >
            {payPayout.isPending ? 'Paiement' : 'Confirmer le paiement'}
          </PrimaryButton>
        </form>
      </div>
    </Panel>
  )
}

function AgentGroupsUnavailable({ error }: { error: unknown }) {
  return (
    <StateMessage title="Groupes indisponibles">
      {isAccessDenied(error)
        ? "L'API actuelle ne permet pas encore à un agent de lister ses groupes. TODO : activer Mes groupes et Dépôts dès qu'un endpoint employé est exposé."
        : getErrorMessage(error)}
    </StateMessage>
  )
}

type TabListProps = {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: Array<{ label: string; value: string }>
}

function TabList({ activeTab, onTabChange, tabs }: TabListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          className={[
            'rounded px-3 py-2 text-sm font-medium transition',
            activeTab === tab.value
              ? 'bg-slate-950 text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
          ].join(' ')}
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

function Panel({
  action,
  children,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  title: string
}) {
  return (
    <section className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-950">{value}</dd>
    </div>
  )
}

function FormField({
  autoComplete,
  error,
  inputMode,
  label,
  registration,
  type = 'text',
}: {
  autoComplete?: string
  error?: string
  inputMode?: 'decimal' | 'numeric'
  label: string
  registration: UseFormRegisterReturn
  type?: 'number' | 'password' | 'text'
}) {
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
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        type={type}
        {...registration}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

function SelectField<T extends string>({
  error,
  label,
  options,
  placeholder,
  registration,
}: {
  error?: string
  label: string
  options: readonly (T | { label: string; value: T })[]
  placeholder?: string
  registration: UseFormRegisterReturn
}) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        {...registration}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const optionLabel =
            typeof option === 'string' ? formatOptionLabel(option) : option.label

          return (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          )
        })}
      </select>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

function TextAreaField({
  error,
  label,
  registration,
}: {
  error?: string
  label: string
  registration: UseFormRegisterReturn
}) {
  const id = registration.name

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="mt-1 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        id={id}
        {...registration}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

function PermissionCheckboxes({
  error,
  registration,
}: {
  error?: string
  registration: UseFormRegisterReturn
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Permissions</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {REMOTE_PAYOUT_PERMISSIONS.map((permission) => (
          <label
            className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm text-slate-700"
            key={permission}
          >
            <input
              className="h-4 w-4 rounded border-slate-300"
              type="checkbox"
              value={permission}
              {...registration}
            />
            {formatPermissionLabel(permission)}
          </label>
        ))}
      </div>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </fieldset>
  )
}

function PrimaryButton({
  children,
  disabled,
  size = 'md',
}: {
  children: ReactNode
  disabled?: boolean
  size?: 'md' | 'sm'
}) {
  return (
    <button
      className={[
        'rounded bg-slate-950 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
      ].join(' ')}
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
  )
}

function StatusBadge({
  status,
}: {
  status: RemoteAgentGroup['status'] | RemotePayoutStatus
}) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    inactive: 'bg-slate-100 text-slate-700 ring-slate-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    canceled: 'bg-rose-50 text-rose-700 ring-rose-200',
  }

  return (
    <span
      className={[
        'inline-flex rounded px-2 py-1 text-xs font-medium ring-1 ring-inset',
        styles[status],
      ].join(' ')}
    >
      {formatStatus(status)}
    </span>
  )
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {children}
    </p>
  )
}

function MutationMessage({
  error,
  success,
}: {
  error?: unknown
  success?: string | null
}) {
  if (error) {
    const pinNotConfigured =
      error instanceof AppApiError && error.errorCode === 'PIN_NOT_CONFIGURED'

    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {getErrorMessage(error)}
        {pinNotConfigured ? (
          <>
            {' '}
            <Link
              className="font-medium underline decoration-red-400 underline-offset-2 hover:text-red-900"
              to="/app/security/transaction-pin"
            >
              Configurer le PIN
            </Link>
          </>
        ) : null}
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

function StateMessage({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function InlineState({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function toOptionalNumber(value: unknown) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined
  }

  return Number(value)
}

function toOptionalString(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function formatMoney(amount: number, currency: 'FCFA' = 'FCFA') {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    active: 'Actif',
    inactive: 'Inactif',
    pending: 'En attente',
    paid: 'Payé',
    canceled: 'Annulé',
  }

  return labels[status] ?? status
}

function formatRole(role: string) {
  const labels: Record<string, string> = {
    agent: 'Agent',
    supervisor: 'Superviseur',
  }

  return labels[role] ?? role
}

function formatOptionLabel(value: string) {
  const labels: Record<string, string> = {
    active: 'Actif',
    inactive: 'Inactif',
    agent: 'Agent',
    supervisor: 'Superviseur',
    cash: 'Espèces',
    bank: 'Banque',
    mobile_money: 'Mobile money',
    other: 'Autre',
  }

  return labels[value] ?? value
}

function buildMemberNameMap(groups: RemoteAgentGroup[]) {
  const memberNames = new Map<string, string>()

  for (const group of groups) {
    for (const member of group.members) {
      memberNames.set(
        member.membership,
        member.agentEmail
          ? `${getMemberDisplayName(member)} (${member.agentEmail})`
          : getMemberDisplayName(member),
      )
    }
  }

  return memberNames
}

function isAccessDenied(error: unknown) {
  return (
    error instanceof AppApiError &&
    (error.statusCode === 403 ||
      error.errorCode === 'REMOTE_AGENT_PAYOUT_ACCESS_DENIED')
  )
}

function getErrorMessage(error: unknown) {
  if (error instanceof AppApiError) {
    if (error.errorCode === 'INVALID_PIN') {
      return 'PIN de transaction invalide.'
    }

    if (error.errorCode === 'PIN_NOT_CONFIGURED') {
      return "Le PIN de transaction n'est pas configuré."
    }

    return error.message
  }

  return error instanceof Error
    ? error.message
    : 'Une erreur est survenue. Réessayez.'
}
