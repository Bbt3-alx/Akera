import { useMutation } from '@tanstack/react-query'

import { createCompany } from './api.ts'

export function useCreateCompany() {
  return useMutation({
    mutationFn: createCompany,
  })
}
