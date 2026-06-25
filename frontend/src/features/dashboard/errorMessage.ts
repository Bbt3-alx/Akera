import { AppApiError } from '../../shared/api/types.ts'

export const DASHBOARD_CONNECTIVITY_ERROR_MESSAGE =
  'Impossible de joindre le serveur. Vérifiez que l’API est démarrée et réessayez.'

export function getDashboardErrorMessage(
  error: unknown,
  fallbackMessage?: string,
) {
  if (isConnectivityError(error)) {
    return DASHBOARD_CONNECTIVITY_ERROR_MESSAGE
  }

  if (fallbackMessage?.trim()) {
    return fallbackMessage
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Une erreur est survenue. Réessayez.'
}

function isConnectivityError(error: unknown) {
  if (error instanceof AppApiError && error.statusCode === 0) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return (
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('cors') ||
    message.includes('xmlhttprequest') ||
    message.includes('load failed')
  )
}
