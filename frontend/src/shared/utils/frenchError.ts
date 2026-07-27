import { AppApiError } from '../api/types.ts'

const messages: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'Vérifiez votre adresse e-mail avant de continuer.',
  INVALID_CREDENTIALS: 'Adresse e-mail ou mot de passe incorrect.',
  INVITATION_CREDENTIAL_REQUIRED: "Saisissez un code ou un lien d'invitation.",
  INVITATION_LOOKUP_RATE_LIMITED:
    'Trop de tentatives. Réessayez dans quelques instants.',
  INVITATION_NOT_FOUND:
    "Cette invitation est introuvable, expirée ou liée à une autre adresse.",
  RESET_TOKEN_INVALID:
    'Ce lien de réinitialisation est invalide ou a expiré.',
  USER_EXISTS: 'Un compte existe déjà avec cette adresse e-mail.',
  VERIFICATION_CODE_INVALID:
    'Le code est invalide ou a expiré. Demandez un nouveau code.',
}

export function getFrenchErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof AppApiError && error.errorCode) {
    return (
      messages[error.errorCode] ??
      'Une erreur est survenue. Veuillez réessayer.'
    )
  }

  return 'Une erreur est survenue. Veuillez réessayer.'
}
