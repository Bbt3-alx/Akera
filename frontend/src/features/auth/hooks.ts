import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMe, login, register } from './api.ts'
import { useAuthStore } from './store.ts'

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

export function useLogin() {
  const queryClient = useQueryClient()
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  return useMutation({
    mutationFn: login,
    onSuccess: async (authPayload) => {
      setAccessToken(authPayload.accessToken)
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
  const queryClient = useQueryClient()
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  return useMutation({
    mutationFn: register,
    onSuccess: async (authPayload) => {
      if (authPayload.accessToken) {
        setAccessToken(authPayload.accessToken)
      }

      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })
}
