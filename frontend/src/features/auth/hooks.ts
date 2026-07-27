import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  forgotPassword,
  getMe,
  login,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from './api.ts'
import { useAuthStore } from './store.ts'

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

export function useLogin() {
  const queryClient = useQueryClient()
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  return useMutation({
    mutationFn: (
      variables: Parameters<typeof login>[0] & { remember?: boolean },
    ) =>
      login({
        email: variables.email,
        password: variables.password,
      }),
    onSuccess: async (authPayload, variables) => {
      setAccessToken(authPayload.accessToken, variables.remember ?? true)
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })
}

export function useMe() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: getMe,
    enabled: Boolean(accessToken),
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: async (authPayload) => {
      setAccessToken(authPayload.accessToken)
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: resendVerification,
  })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword })
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword })
}
