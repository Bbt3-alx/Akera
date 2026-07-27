import { Check } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  AuthHeader,
  AuthPage,
  PrimaryButton,
} from '../../../shared/components/AuthUI.tsx'

export function OnboardingReadyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const message =
    (location.state as { message?: string } | null)?.message ??
    'La configuration initiale est terminée. Vos données sont sécurisées et prêtes à être explorées.'

  return (
    <AuthPage>
      <AuthHeader
        icon={Check}
        subtitle={message}
        title="Votre espace Akera est prêt."
      />
      <PrimaryButton className="w-full" onClick={() => navigate('/app')}>
        Accéder au tableau de bord
      </PrimaryButton>
      <p className="auth-footer">
        <Link className="auth-secondary-link" to="/docs">
          Consulter la documentation
        </Link>
      </p>
    </AuthPage>
  )
}
