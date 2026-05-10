/**
 * Safe Order — Reusable UI Components
 * Button, Badge, Card, Input, Spinner, StatusBadge
 */
import React from 'react'

/* ═══════════════════════════════════════════
   BUTTON
   ═══════════════════════════════════════════ */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  children, variant = 'primary', size = 'md', loading, fullWidth, className = '', ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className="btn__spinner" /> : children}
    </button>
  )
}

/* ═══════════════════════════════════════════
   INPUT
   ═══════════════════════════════════════════ */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  /** Style applied to the wrapper. Use `inputStyle` to style the input element itself. */
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', style, inputStyle, ...props }, ref) => (
    <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`} style={style}>
      {label && <label className="form-field__label">{label}</label>}
      <input ref={ref} className="form-field__input" style={inputStyle} {...props} />
      {error && <span className="form-field__error">{error}</span>}
      {hint && !error && <span className="form-field__hint">{hint}</span>}
    </div>
  )
)
Input.displayName = 'Input'

/* ═══════════════════════════════════════════
   SELECT
   ═══════════════════════════════════════════ */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  const t = useT()
  return (
    <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
      {label && <label className="form-field__label">{label}</label>}
      <select className="form-field__input form-field__select" {...props}>
        <option value="">{t('common.select_placeholder')}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="form-field__error">{error}</span>}
    </div>
  )
}

/* ═══════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════ */

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  hoverable?: boolean
  style?: React.CSSProperties
}

export function Card({ children, className = '', padding = 'md', onClick, hoverable, style }: CardProps) {
  return (
    <div
      className={`card card--${padding} ${hoverable ? 'card--hoverable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════
   BADGE
   ═══════════════════════════════════════════ */

import { useT } from '../../i18n'

const BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  safe_pay: { color: '#0D6E3F', bg: '#e6f5ed' },
  new: { color: '#0080ff', bg: '#e8f3ff' },
  loyal: { color: '#7c3aed', bg: '#f3e8ff' },
  risk: { color: '#dc2626', bg: '#fef2f2' },
}

export function OrderBadge({ badge }: { badge: string | null }) {
  const t = useT()
  if (!badge) return null
  const colors = BADGE_COLORS[badge]
  if (!colors) return null
  return (
    <span className="badge" style={{ color: colors.color, backgroundColor: colors.bg }}>
      {t(`badge.${badge}`)}
    </span>
  )
}

/* ═══════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════ */

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  confirmation: { color: '#0080ff', bg: '#e8f3ff' },
  preparation: { color: '#f59e0b', bg: '#fef3cd' },
  dispatch: { color: '#8b5cf6', bg: '#f3e8ff' },
  delivery: { color: '#06b6d4', bg: '#e0f7fa' },
  delivered: { color: '#10b981', bg: '#e6f5ed' },
  return_processed: { color: '#ef4444', bg: '#fef2f2' },
}

export function StatusBadge({ status }: { status: string }) {
  const t = useT()
  const colors = STATUS_COLORS[status]
  if (!colors) return <span className="badge">{status}</span>
  return (
    <span className="badge" style={{ color: colors.color, backgroundColor: colors.bg }}>
      {t(`status.${status}`)}
    </span>
  )
}

/* ═══════════════════════════════════════════
   SPINNER
   ═══════════════════════════════════════════ */

export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div className="spinner-container">
      <div className="spinner" style={{ width: size, height: size }} />
    </div>
  )
}

/* ═══════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════ */

interface StatCardProps {
  label: string
  value: string | number
  change?: number
  icon?: React.ReactNode
  color?: string
}

export function StatCard({ label, value, change, icon, color = 'var(--color-primary)' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon" style={{ color, backgroundColor: `${color}12` }}>
        {icon}
      </div>
      <div className="stat-card__content">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
        {change !== undefined && (
          <span className={`stat-card__change ${change >= 0 ? 'stat-card__change--up' : 'stat-card__change--down'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════ */

export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
    </div>
  )
}
