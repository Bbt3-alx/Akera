import {
  Eye,
  EyeOff,
  Landmark,
  type LucideIcon,
} from 'lucide-react'
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'

export function AuthPage({
  children,
  wide = false,
}: {
  children: ReactNode
  wide?: boolean
}) {
  return (
    <main className="auth-page">
      <section className={`auth-card ${wide ? 'auth-card--wide' : ''}`}>
        {children}
      </section>
    </main>
  )
}

export function BrandMark({
  label = 'Akera',
  showIcon = true,
  showLabel = true,
}: {
  label?: string
  showIcon?: boolean
  showLabel?: boolean
}) {
  return (
    <div className="auth-brand" aria-label={label}>
      {showIcon ? (
        <span className="auth-brand__icon">
          <Landmark aria-hidden="true" size={26} strokeWidth={2} />
        </span>
      ) : null}
      {showLabel ? <span>{label}</span> : null}
    </div>
  )
}

export function AuthHeader({
  icon: Icon,
  subtitle,
  title,
}: {
  icon?: LucideIcon
  subtitle?: ReactNode
  title: string
}) {
  return (
    <header className="auth-header">
      {Icon ? (
        <span className="auth-header__icon">
          <Icon aria-hidden="true" size={30} strokeWidth={2} />
        </span>
      ) : null}
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  icon?: LucideIcon
  label: string
}

export const AuthField = forwardRef<HTMLInputElement, FieldProps>(
  function AuthField({ error, icon: Icon, label, type, ...props }, ref) {
    const [visible, setVisible] = useState(false)
    const isPassword = type === 'password'

    return (
      <div className="auth-field">
        <label htmlFor={props.id}>{label}</label>
        <div className="auth-input-wrap">
          {Icon ? (
            <Icon
              aria-hidden="true"
              className="auth-input-icon"
              size={20}
              strokeWidth={1.8}
            />
          ) : null}
          <input
            aria-invalid={Boolean(error)}
            className={Icon ? 'has-icon' : ''}
            ref={ref}
            type={isPassword && visible ? 'text' : type}
            {...props}
          />
          {isPassword ? (
            <button
              aria-label={
                visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
              }
              className="auth-password-toggle"
              onClick={() => setVisible((value) => !value)}
              type="button"
            >
              {visible ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="auth-field__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

export function AuthNotice({
  children,
  tone = 'error',
}: {
  children: ReactNode
  tone?: 'error' | 'success' | 'info'
}) {
  return (
    <div className={`auth-notice auth-notice--${tone}`} role="status">
      {children}
    </div>
  )
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`auth-primary ${className}`} {...props}>
      {children}
    </button>
  )
}

export function SecondaryLink({
  children,
  to,
}: {
  children: ReactNode
  to: string
}) {
  return (
    <Link className="auth-secondary-link" to={to}>
      {children}
    </Link>
  )
}
