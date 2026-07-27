import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import {
  AuthField,
  AuthHeader,
  AuthPage,
  PrimaryButton,
  SecondaryLink,
} from '../../../shared/components/AuthUI.tsx'

const schema = z.object({
  credential: z.string().min(1, 'Saisissez le code ou collez le lien reçu.'),
})

export function JoinCompanyPage() {
  const navigate = useNavigate()
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { credential: '' },
  })

  return (
    <AuthPage>
      <AuthHeader
        icon={Building2}
        subtitle="Utilisez le code reçu ou collez le lien complet d’invitation."
        title="Rejoindre une entreprise"
      />
      <form
        className="auth-form"
        onSubmit={handleSubmit(({ credential }) => {
          const value = credential.trim()
          const fromLink = value.match(/\/invitations\/([^/?#]+)/)?.[1]
          navigate(`/invitations/${encodeURIComponent(fromLink ?? value)}`)
        })}
      >
        <AuthField
          error={errors.credential?.message}
          id="invitation-credential"
          label="Code ou lien d’invitation"
          placeholder="Ex. ABCD234567"
          {...register('credential')}
        />
        <PrimaryButton>Continuer</PrimaryButton>
      </form>
      <p className="auth-footer">
        <SecondaryLink to="/welcome">Retour à l’accueil</SecondaryLink>
      </p>
    </AuthPage>
  )
}
