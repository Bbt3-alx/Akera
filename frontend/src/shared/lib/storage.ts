const hasLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export function getStorageItem(key: string): string | null {
  if (!hasLocalStorage()) {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setStorageItem(key: string, value: string): void {
  if (!hasLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore unavailable storage, quota errors, and privacy mode failures.
  }
}

export function removeStorageItem(key: string): void {
  if (!hasLocalStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore unavailable storage and privacy mode failures.
  }
}
