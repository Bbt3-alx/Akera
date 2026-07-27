import { create } from 'zustand'

import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '../../shared/lib/storage.ts'

const ACCESS_TOKEN_STORAGE_KEY = 'akera.accessToken'
const hasSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'

type AuthState = {
  accessToken: string | null
  setAccessToken: (token: string, persistent?: boolean) => void
  clearAccessToken: () => void
  hydrateAccessToken: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:
    getStorageItem(ACCESS_TOKEN_STORAGE_KEY) ??
    (hasSessionStorage()
      ? window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
      : null),
  setAccessToken: (token, persistent = true) => {
    if (persistent) {
      setStorageItem(ACCESS_TOKEN_STORAGE_KEY, token)
      if (hasSessionStorage()) {
        window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
      }
    } else {
      removeStorageItem(ACCESS_TOKEN_STORAGE_KEY)
      if (hasSessionStorage()) {
        window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
      }
    }
    set({ accessToken: token })
  },
  clearAccessToken: () => {
    removeStorageItem(ACCESS_TOKEN_STORAGE_KEY)
    if (hasSessionStorage()) {
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    }
    set({ accessToken: null })
  },
  hydrateAccessToken: () => {
    set({
      accessToken:
        getStorageItem(ACCESS_TOKEN_STORAGE_KEY) ??
        (hasSessionStorage()
          ? window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
          : null),
    })
  },
}))
