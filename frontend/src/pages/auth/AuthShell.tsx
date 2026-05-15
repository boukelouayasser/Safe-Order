/**
 * Safe Order — Shared shell for the auth pages (Login + Register).
 *
 * 3-panel sliding stage (Merchant | Brand | Customer) with a floating pill
 * switch. Pages drop their merchant/customer panels into this shell.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export type AuthView = 'customer' | 'merchant'

/* ════════════════════════════════════════════
   PASSWORD STRENGTH HELPERS
   ════════════════════════════════════════════ */
export const PWD_BAR_COLORS = ['#e4e8f3', '#ff6f6f', '#ffa84d', '#ffd24d', '#5dd39e', '#1b3fd8']

export function strengthOf(pwd: string): number {
  let s = 0
  if (pwd.length >= 8) s++
  if (pwd.length >= 12) s++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++
  if (/\d/.test(pwd)) s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  return Math.min(s, 4)
}

/* ════════════════════════════════════════════
   LOGO MARK — Safe-Order shield icon
   Transparent-background PNG; renders the shield
   shape directly on any background.
   ════════════════════════════════════════════ */
export function LogoMark({ variant = 'dark', size = 52 }: { variant?: 'dark' | 'light'; size?: number }) {
  return (
    <img
      src="/logo_safe_order.png"
      alt="Safe-Order"
      width={size}
      height={size}
      style={{
        display: 'block',
        width: size,
        height: size,
        objectFit: 'contain',
        filter:
          variant === 'light'
            ? 'drop-shadow(0 4px 10px rgba(0,0,0,.35))'
            : 'none',
      }}
    />
  )
}

/* ════════════════════════════════════════════
   FIELD — label above input, no animation
   ════════════════════════════════════════════ */
export function Field({
  label,
  type = 'text',
  value,
  onChange,
  required,
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
  pwdToggle,
  autoFocus,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email' | 'numeric'
  maxLength?: number
  placeholder?: string
  pwdToggle?: boolean
  autoFocus?: boolean
}) {
  const [shown, setShown] = useState(false)
  const realType = pwdToggle ? (shown ? 'text' : 'password') : type
  return (
    <div className="reg-field">
      <label>{label}</label>
      <div className="reg-input-wrap">
        <input
          type={realType}
          value={value}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
        />
        {pwdToggle && (
          <button
            type="button"
            className="reg-input-icon"
            onClick={() => setShown(s => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  placeholder = 'Select…',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
}) {
  return (
    <div className="reg-field">
      <label>{label}</label>
      <div className="reg-input-wrap">
        <select value={value} required={required} onChange={e => onChange(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg className="reg-select-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

export function Spinner() {
  return <span className="reg-btn-spinner" />
}

/* ════════════════════════════════════════════
   BRAND PANEL
   ════════════════════════════════════════════ */
export function BrandPanel() {
  return (
    <section className="reg-panel brand-panel" aria-label="About Safe-Order">
      <div className="reg-brand-bg">
        <div className="ring r1" />
        <div className="ring r2" />
        <div className="ring r3" />
        <div className="dot d1" />
        <div className="dot d2" />
        <div className="grid-bottom" />
      </div>

      <div className="reg-floating-card fc-1">
        <div className="pulse" />
        <div>
          <div className="title">Parcel #SO-48201</div>
          <div className="sub">Out for delivery · Algiers</div>
        </div>
      </div>
      <div className="reg-floating-card fc-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5dffb1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <div>
          <div className="title">Return approved</div>
          <div className="sub">Refund issued in 2 hours</div>
        </div>
      </div>

      <div className="reg-brand-inner">
        <div className="reg-brand-logo">
          <LogoMark variant="light" />
          <div className="wordmark">Safe<span>-</span>Order</div>
        </div>

        <h2 className="reg-brand-title">
          Every parcel<br />
          <em>arrives,</em> or comes<br />
          right back.
        </h2>
        <p className="reg-brand-slogan">
          Track orders in real time. Handle returns without the headache.
        </p>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════
   AUTH SHELL — topbar + switch + sliding stage
   ════════════════════════════════════════════ */
interface AuthShellProps {
  view: AuthView
  setView: (v: AuthView) => void
  altLinkLabel: string
  altLinkTo: string
  merchantPanel: React.ReactNode
  customerPanel: React.ReactNode
}

export default function AuthShell({
  view,
  setView,
  altLinkLabel,
  altLinkTo,
  merchantPanel,
  customerPanel,
}: AuthShellProps) {
  // Arrow-key shortcuts. Don't hijack typing in form fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft') setView('merchant')
      if (e.key === 'ArrowRight') setView('customer')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setView])

  return (
    <div className="reg-root">
      <div className="reg-topbar">
        <Link to="/" className="reg-topbar-brand">
          <LogoMark size={28} />
          <span>Safe-Order</span>
        </Link>
        <Link to={altLinkTo} state={{ authView: view }} className="reg-topbar-alt">{altLinkLabel}</Link>
      </div>

      <div className="reg-switch-wrap">
        <div
          className={`reg-switch ${view === 'customer' ? 'is-customer' : 'is-merchant'}`}
          role="tablist"
          aria-label="Account type"
        >
          {/* Button order matches form layout in the rail.
              Rail = [merchantPanel, BrandPanel, customerPanel] (left → right when no transform).
              view-merchant: rail at translateX(0) → merchant form sits on the LEFT.
              view-customer: rail at translateX(-50vw) → customer form sits on the RIGHT.
              So Merchant button goes on the left, Customer button on the right —
              keeping label, pill, and form on the same side. */}
          <button
            className={view === 'merchant' ? 'active' : ''}
            type="button"
            aria-pressed={view === 'merchant'}
            onClick={() => setView('merchant')}
          >
            Merchant
          </button>
          <button
            className={view === 'customer' ? 'active' : ''}
            type="button"
            aria-pressed={view === 'customer'}
            onClick={() => setView('customer')}
          >
            Customer
          </button>
        </div>
      </div>

      <div className="reg-stage">
        <div className={`reg-rail ${view === 'customer' ? 'view-customer' : 'view-merchant'}`}>
          {merchantPanel}
          <BrandPanel />
          {customerPanel}
        </div>
      </div>
    </div>
  )
}
