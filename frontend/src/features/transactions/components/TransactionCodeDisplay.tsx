type TransactionCodeDisplayProps = {
  className?: string
  code: string
}

export function TransactionCodeDisplay({
  className,
  code,
}: TransactionCodeDisplayProps) {
  return (
    <span className={className} title={code}>
      {shortenTransactionCode(code)}
    </span>
  )
}

function shortenTransactionCode(code: string) {
  const normalizedCode = code.trim()

  if (normalizedCode.length <= 14) {
    return normalizedCode
  }

  const [prefix] = normalizedCode.split('-')
  const suffix = normalizedCode.slice(-4)

  if (!prefix || prefix.length + suffix.length + 1 >= normalizedCode.length) {
    return normalizedCode
  }

  return `${prefix}\u2026${suffix}`
}
