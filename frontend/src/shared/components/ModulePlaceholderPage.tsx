type ModulePlaceholderPageProps = {
  description?: string
  title: string
}

export function ModulePlaceholderPage({
  description = 'This workspace area is not available yet.',
  title,
}: ModulePlaceholderPageProps) {
  return (
    <section className="rounded border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </section>
  )
}
