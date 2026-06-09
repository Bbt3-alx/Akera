import { create } from 'zustand'

import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '../../shared/lib/storage.ts'

const ACCESS_TOKEN_STORAGE_KEY = 'akera.accessToken'

type AuthState = {
  accessToken: string | null
  setAccessToken: (token: string) => void
  clearAccessToken: () => void
  hydrateAccessToken: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: getStorageItem(ACCESS_TOKEN_STORAGE_KEY),
  setAccessToken: (token) => {
    setStorageItem(ACCESS_TOKEN_STORAGE_KEY, token)
    set({ accessToken: token })
  },
  clearAccessToken: () => {
    removeStorageItem(ACCESS_TOKEN_STORAGE_KEY)
    set({ accessToken: null })
  },
  hydrateAccessToken: () => {
    set({ accessToken: getStorageItem(ACCESS_TOKEN_STORAGE_KEY) })
  },
}))
