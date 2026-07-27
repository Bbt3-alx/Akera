import { Building2, LogIn, Mail, Globe2, CircleHelp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

const choices = [
  {
    icon: Building2,
    title: 'Créer une entreprise',
    description: 'Configurez un nouvel espace de travail pour votre organisation.',
    to: '/create-company',
  },
  {
    icon: LogIn,
    title: 'Rejoindre une entreprise',
    description: 'Saisissez un code ou ouvrez un lien d’invitation sécurisé.',
    to: '/join-company',
  },
  {
    icon: Mail,
    title: 'J’ai reçu une invitation',
    description: 'Consultez les invitations associées à votre adresse e-mail.',
    to: '/select-company',
  },
]

export function WelcomePage() {
  const navigate = useNavigate()
  return (
    <main className="min-h-screen bg-[#f5f7f9] text-[#111318]">
      <header className="flex h-16 items-center justify-between border-b border-slate-300 px-5 sm:px-7">
        <strong className="text-xl">Akera Financial</strong>
        <div className="flex gap-4 text-slate-600">
          <Link aria-label="Documentation" to="/docs"><CircleHelp size={22} /></Link>
          <Globe2 aria-label="Interface en français" size={22} />
        </div>
      </header>
      <section className="mx-auto flex max-w-5xl flex-col items-center px-5 py-16 sm:py-28">
        <h1 className="text-center text-4xl font-bold tracking-tight">
          Bienvenue sur Akera
        </h1>
        <p className="mt-4 text-center text-lg text-slate-600">
          Créez votre entreprise ou rejoignez une entreprise existante.
        </p>
        <div className="mt-12 grid w-full gap-5 md:grid-cols-3">
          {choices.map(({ description, icon: Icon, title, to }) => (
            <button
              className="min-h-56 rounded border border-slate-300 bg-white p-7 text-left transition hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
              key={title}
              onClick={() => navigate(to)}
              type="button"
            >
              <span className="mb-6 inline-grid h-12 w-12 place-items-center bg-slate-100">
                <Icon size={25} strokeWidth={2} />
              </span>
              <strong className="block text-xl">{title}</strong>
              <span className="mt-4 block leading-6 text-slate-600">
                {description}
              </span>
            </button>
          ))}
        </div>
        <Link className="mt-8 text-slate-600 hover:underline" to="/login">
          Retour à l’écran de connexion
        </Link>
      </section>
    </main>
  )
}
