/**
 * Safe Order — Language picker.
 * Compact pill-style switch for AR / FR / EN.
 */
import { useLanguage } from '../i18n'
import { LOCALES, Locale } from '../i18n/translations'

interface Props {
  variant?: 'pills' | 'select'
  size?: 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
}

export default function LanguagePicker({ variant = 'pills', size = 'md', className = '', style }: Props) {
  const { locale, setLocale } = useLanguage()

  if (variant === 'select') {
    return (
      <select
        className={className}
        style={{
          padding: size === 'sm' ? '4px 8px' : '6px 10px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          fontSize: size === 'sm' ? 12 : 13,
          background: '#fff',
          cursor: 'pointer',
          ...style,
        }}
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map(l => (
          <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
        ))}
      </select>
    )
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 3,
        borderRadius: 999,
        background: '#f1f5f9',
        ...style,
      }}
    >
      {LOCALES.map(l => {
        const active = l.code === locale
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            aria-pressed={active}
            style={{
              padding: size === 'sm' ? '3px 9px' : '5px 12px',
              fontSize: size === 'sm' ? 11 : 12,
              fontWeight: 600,
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: active ? '#0080ff' : 'transparent',
              color: active ? '#fff' : '#475569',
              transition: 'all 150ms ease',
            }}
          >
            {l.flag} {l.code.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
