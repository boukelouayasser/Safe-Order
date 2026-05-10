/**
 * Safe Order — "Paste your order link" landing.
 *
 * Reached at /order (no token). Lets the customer paste either the full URL the
 * merchant sent them or just the bare token, and routes to the correct page.
 *
 * Accepts:
 *   - https://safeorder.dz/order/<hex32>
 *   - http://localhost:5173/order/<hex32>
 *   - <hex32>
 *   - <hex32> with surrounding whitespace
 *   - Tracking codes like SO-XXXXXX (routes to /track instead)
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useT } from '../../i18n'
import LanguagePicker from '../../components/LanguagePicker'
import { Button, Input } from '../../components/ui'

const TOKEN_RE = /([a-f0-9]{32})/i
const TRACKING_RE = /(SO-[A-Z0-9]{4,8})/i

export default function PasteLink() {
  const navigate = useNavigate()
  const t = useT()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const v = value.trim()

    // 1) Try full link path /order/<token>
    const linkMatch = v.match(/\/order\/([a-f0-9]{32})/i)
    if (linkMatch) {
      navigate(`/order/${linkMatch[1]}`)
      return
    }

    // 2) Tracking code path /track/<code> or bare SO-XXXX
    const trackingMatch = v.match(/\/track\/(SO-[A-Z0-9]{4,8})/i) || v.match(TRACKING_RE)
    if (trackingMatch) {
      navigate(`/track/${trackingMatch[1].toUpperCase()}`)
      return
    }

    // 3) Bare 32-hex token
    const tokenMatch = v.match(TOKEN_RE)
    if (tokenMatch) {
      navigate(`/order/${tokenMatch[1]}`)
      return
    }

    setError(t('order.paste.invalid'))
  }

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguagePicker size="sm" />
      </div>
      <div className="auth-card" style={{ maxWidth: 480, width: '100%' }}>
        <div className="auth-card__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="auth-card__logo-icon">🛡</div>
          <span className="auth-card__logo-text">Safe Order</span>
        </div>

        <h2 className="auth-card__title">{t('order.paste.title')}</h2>
        <p className="auth-card__subtitle">{t('order.paste.subtitle')}</p>

        <form className="auth-card__form" onSubmit={submit}>
          <Input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t('order.paste.placeholder')}
            autoFocus
          />
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
          <Button type="submit" fullWidth>{t('order.paste.cta')}</Button>
        </form>

        <div className="auth-card__footer">
          <Link to="/">{t('common.home')}</Link>
        </div>
      </div>
    </div>
  )
}
