import axios, { type AxiosError } from 'axios'

import { useAuthStore } from '../../features/auth/store.ts'
import { useCompaniesStore } from '../../features/companies/store.ts'
import { AppApiError, type ApiErrorResponse } from './types.ts'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export const http = axios.create({
  baseURL: API_BASE_URL,
})

http.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  const { activeCompanyId } = useCompaniesStore.getState()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  if (activeCompanyId) {
    config.headers['x-company-id'] = activeCompanyId
  }

  return config
})

http.interceptors.response.use(
  (response) => {
    if (isApiErrorResponse(response.data)) {
      return Promise.reject(
        new AppApiError({
          message: response.data.message,
          statusCode: response.data.code ?? response.status,
          errorCode: response.data.errorCode,
          details: response.data.details,
        }),
      )
    }

    return response.data
  },
  (error: AxiosError<unknown>) => {
    return Promise.reject(toAppApiError(error))
  },
)

function toAppApiError(error: AxiosError<unknown>): AppApiError {
  const statusCode = error.response?.status ?? 0
  const data = error.response?.data

  if (isApiErrorResponse(data)) {
    return new AppApiError({
      message: data.message,
      statusCode: data.code ?? statusCode,
      errorCode: data.errorCode,
      details: data.details,
    })
  }

  if (hasMessage(data)) {
    return new AppApiError({
      message: data.message,
      statusCode,
    })
  }

  return new AppApiError({
    message: error.message || 'API request failed',
    statusCode,
  })
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    value.success === false &&
    'message' in value &&
    typeof value.message === 'string'
  )
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  )
}
