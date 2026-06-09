export type ApiErrorResponse = {
  success: false
  code?: number
  message: string
  errorCode?: string
  details?: unknown
}

export type ApiResponse<T> =
  | {
      success: true
      data: T
      message?: string
    }
  | ApiErrorResponse

type AppApiErrorOptions = {
  message: string
  statusCode: number
  errorCode?: string
  details?: unknown
}

export class AppApiError extends Error {
  readonly statusCode: number
  readonly errorCode?: string
  readonly details?: unknown

  constructor({ message, statusCode, errorCode, details }: AppApiErrorOptions) {
    super(message)
    this.name = 'AppApiError'
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
  }
}
