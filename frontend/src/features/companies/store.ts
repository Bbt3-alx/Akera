import { create } from 'zustand'

import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '../../shared/lib/storage.ts'

const ACTIVE_COMPANY_STORAGE_KEY = 'akera.activeCompanyId'

type CompaniesState = {
  activeCompanyId: string | null
  setActiveCompanyId: (companyId: string) => void
  clearActiveCompanyId: () => void
  hydrateActiveCompanyId: () => void
}

export const useCompaniesStore = create<CompaniesState>((set) => ({
  activeCompanyId: getStorageItem(ACTIVE_COMPANY_STORAGE_KEY),
  setActiveCompanyId: (companyId) => {
    setStorageItem(ACTIVE_COMPANY_STORAGE_KEY, companyId)
    set({ activeCompanyId: companyId })
  },
  clearActiveCompanyId: () => {
    removeStorageItem(ACTIVE_COMPANY_STORAGE_KEY)
    set({ activeCompanyId: null })
  },
  hydrateActiveCompanyId: () => {
    set({ activeCompanyId: getStorageItem(ACTIVE_COMPANY_STORAGE_KEY) })
  },
}))
