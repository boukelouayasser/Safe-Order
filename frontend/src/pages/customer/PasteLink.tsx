/**
 * Safe Order — "Paste your order link" landing.
 *
 * Reached at /order (no token). Lets the customer paste either the full URL the
 * merchant sent them or just the bare token, and routes to the correct page.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import CustomerHeader from '../../components/CustomerHeader'

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

    const linkMatch = v.match(/\/order\/([a-f0-9]{32})/i)
    if (linkMatch) { navigate(`/order/${linkMatch[1]}`); return }

    const trackingMatch = v.match(/\/track\/(SO-[A-Z0-9]{4,8})/i) || v.match(TRACKING_RE)
    if (trackingMatch) { navigate(`/track/${trackingMatch[1].toUpperCase()}`); return }

    const tokenMatch = v.match(TOKEN_RE)
    if (tokenMatch) { navigate(`/order/${tokenMatch[1]}`); return }

    setError(t('order.paste.invalid'))
  }

  return (
    <div className="cs-page">
      <CustomerHeader />
      <div className="cs-shell narrow centered">
        <div className="cs-intro" style={{ textAlign: 'center' }}>
          <div className="cs-eyebrow" style={{ justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Safe-Order
          </div>
          <h1 className="cs-h1">{t('order.paste.title')}</h1>
          <p className="cs-sub">{t('order.paste.subtitle')}</p>
        </div>

        <div className="cs-card cs-card-pad">
          <form className="cs-form" onSubmit={submit}>
            <div className="cs-field" style={{ marginBottom: 0 }}>
              <label>{t('order.paste.title')}</label>
              <input
                className="cs-input"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={t('order.paste.placeholder')}
                autoFocus
              />
            </div>
            {error && <div className="cs-error">{error}</div>}
            <button type="submit" className="cs-btn cs-btn--primary cs-btn--block">
              {t('order.paste.cta')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
