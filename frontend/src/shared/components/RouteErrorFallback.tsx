import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export function RouteErrorFallback() {
  const error = useRouteError()
  const detail = import.meta.env.DEV ? getRouteErrorDetail(error) : null

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-lg rounded border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium uppercase text-slate-500">
          Application error
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          Something went wrong.
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          You can return to the dashboard and try again.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          to="/app/dashboard"
        >
          Return to dashboard
        </Link>

        {detail ? (
          <pre className="mt-6 max-h-56 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-left text-xs text-slate-700">
            {detail}
          </pre>
        ) : null}
      </div>
    </main>
  )
}

function getRouteErrorDetail(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return [
      `${error.status} ${error.statusText}`.trim(),
      stringifyRouteErrorData(error.data),
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (error instanceof Error) {
    return error.stack ?? error.message
  }

  return stringifyRouteErrorData(error)
}

function stringifyRouteErrorData(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
