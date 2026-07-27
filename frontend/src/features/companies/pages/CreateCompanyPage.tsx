import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Gem, Network, UsersRound, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'

import {
  AuthField,
  AuthNotice,
  AuthPage,
  PrimaryButton,
} from '../../../shared/components/AuthUI.tsx'
import { getFrenchErrorMessage } from '../../../shared/utils/frenchError.ts'
import { AUTH_ME_QUERY_KEY } from '../../auth/hooks.ts'
import { useCreateCompany } from '../hooks.ts'
import { toCreateCompanyPayload } from '../onboarding.ts'
import { useCompaniesStore } from '../store.ts'

const schema = z.object({
  name: z.string().min(1, 'Le nom de l’entreprise est requis.'),
  address: z.string().min(1, 'L’adresse est requise.'),
  contact: z.string().min(1, 'Le contact est requis.'),
  baseCurrency: z.enum(['FCFA', 'GNF']),
  activity: z.enum(['correspondents', 'agents', 'gold', 'mixed']),
  mixedWorkflow: z.enum(['correspondent_collection', 'remote_agent_payout', 'both']),
})
type Values = z.infer<typeof schema>

const activities = [
  {
    value: 'correspondents',
    title: 'Correspondants / transferts',
    description: 'Gestion des flux financiers',
    icon: UsersRound,
  },
  {
    value: 'agents',
    title: 'Agents distants',
    description: 'Réseau de distribution',
    icon: Network,
  },
  {
    value: 'gold',
    title: 'Or / Gold',
    description: 'Négoce de métaux précieux',
    icon: Gem,
  },
  {
    value: 'mixed',
    title: 'Mixte',
    description: 'Activités combinées',
    icon: Building2,
  },
] as const

export function CreateCompanyPage({
  variant = 'standalone',
}: {
  variant?: 'standalone' | 'embedded'
}) {
  const embedded = variant === 'embedded'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useCreateCompany()
  const setCompany = useCompaniesStore((state) => state.setActiveCompanyId)
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      address: '',
      contact: '',
      baseCurrency: 'FCFA',
      activity: 'correspondents',
      mixedWorkflow: 'both',
    },
  })
  const activity = useWatch({ control, name: 'activity' })

  const submit = handleSubmit(async (values) => {
    const businessType =
      values.activity === 'gold'
        ? 'gold_trading'
        : values.activity === 'mixed'
          ? 'mixed'
          : 'transfer'
    const transferWorkflowSelection =
      values.activity === 'agents'
        ? 'remote_agent_payout'
        : values.activity === 'mixed'
          ? values.mixedWorkflow
          : 'correspondent_collection'
    const response = await mutation.mutateAsync(
      toCreateCompanyPayload({
        name: values.name.trim(),
        address: values.address.trim(),
        contact: values.contact.trim(),
        baseCurrency: values.baseCurrency,
        businessType,
        transferWorkflowSelection,
      }),
    )
    setCompany(response.membership.companyId)
    await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    navigate(embedded ? '/app/dashboard' : '/onboarding/ready', {
      replace: true,
    })
  })

  const content = (
    <section className={embedded ? 'w-full max-w-3xl' : ''}>
      <div className="mb-7 flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Créer une entreprise</h1>
          <p className="mt-3 text-slate-600">Configurez le profil de la nouvelle entité.</p>
        </div>
        {!embedded ? (
          <button aria-label="Fermer" className="p-2" onClick={() => navigate('/welcome')} type="button">
            <X size={25} />
          </button>
        ) : null}
      </div>
      <form className="auth-form" onSubmit={submit}>
        <AuthField
          error={errors.name?.message}
          id="company-name"
          label="Nom de l’entreprise"
          placeholder="Ex. Akera Holding"
          {...register('name')}
        />
        <div className="auth-form-row">
          <AuthField
            error={errors.address?.message}
            id="company-address"
            label="Adresse"
            placeholder="Bamako, Mali"
            {...register('address')}
          />
          <AuthField
            error={errors.contact?.message}
            id="company-contact"
            label="Contact"
            placeholder="+223 70 00 00 00"
            {...register('contact')}
          />
        </div>
        <div>
          <label className="auth-label" htmlFor="base-currency">Devise principale</label>
          <select className="auth-select" id="base-currency" {...register('baseCurrency')}>
            <option value="FCFA">FCFA</option>
            <option value="GNF">GNF</option>
          </select>
        </div>
        <fieldset>
          <legend className="auth-label mb-3">Type d’activité</legend>
          <div className="auth-choice-grid">
            {activities.map(({ description, icon: Icon, title, value }) => (
              <label className="auth-choice" key={value}>
                <input type="radio" value={value} {...register('activity')} />
                <Icon className="shrink-0" size={22} />
                <span>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {activity === 'mixed' ? (
          <div>
            <label className="auth-label" htmlFor="mixed-workflow">Flux de transfert</label>
            <select className="auth-select" id="mixed-workflow" {...register('mixedWorkflow')}>
              <option value="both">Correspondants et agents distants</option>
              <option value="correspondent_collection">Correspondants uniquement</option>
              <option value="remote_agent_payout">Agents distants uniquement</option>
            </select>
          </div>
        ) : null}
        {mutation.error ? (
          <AuthNotice>{getFrenchErrorMessage(mutation.error)}</AuthNotice>
        ) : null}
        <div className="auth-actions">
          <button className="auth-ghost" onClick={() => navigate(embedded ? '/app/dashboard' : '/welcome')} type="button">
            Annuler
          </button>
          <PrimaryButton disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? 'Création…' : 'Créer l’entreprise'}
          </PrimaryButton>
        </div>
      </form>
    </section>
  )

  return embedded ? content : <AuthPage wide>{content}</AuthPage>
}
