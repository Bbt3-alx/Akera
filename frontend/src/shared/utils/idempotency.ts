export function createIdempotencyKey(prefix?: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `${prefix || 'idem'}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
}
