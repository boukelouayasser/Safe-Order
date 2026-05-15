/**
 * Safe Order — Customer hub page (FR-12 Cart + FR-15 Wallet entry).
 * Auth-gated; auto-loads orders, wallet summary, and weekly/monthly history.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackingApi, paymentsApi } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import CustomerHeader from '../../components/CustomerHeader'

type Period = 'weekly' | 'monthly'

const STATUS_TONE: Record<string, string> = {
  confirmation: 'blue', preparation: 'amber', dispatch: 'slate',
  delivery: 'blue', delivered: 'green', return_processed: 'red',
}

export default function CustomerHome() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const t = useT()

  const [trackCode, setTrackCode] = useState('')
  const [orders, setOrders] = useState<any[] | null>(null)
  const [wallet, setWallet] = useState<any | null>(null)
  const [history, setHistory] = useState<any[] | null>(null)
  const [period, setPeriod] = useState<Period>('monthly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) {
      navigate('/customer/login', { replace: true })
      return
    }
    if (user.role !== 'customer') navigate('/', { replace: true })
  }, [isLoading, isAuthenticated, user, navigate])

  useEffect(() => {
    if (!user || user.role !== 'customer') return
    const phone = user.phone
    setLoading(true)
    Promise.all([
      trackingApi.getByPhone(phone),
      paymentsApi.getWallet(phone).catch(() => null),
      paymentsApi.getWalletHistory(phone, period).catch(() => ({ buckets: [] })),
    ])
      .then(([list, w, h]: any[]) => { setOrders(list); setWallet(w); setHistory(h.buckets || []) })
      .catch((err: any) => setError(err.message || 'Erreur'))
      .finally(() => setLoading(false))
  }, [user, period])

  const goTrackByCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackCode.trim()) return
    navigate(`/track/${trackCode.trim().toUpperCase()}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/customer/login', { replace: true })
  }

  if (isLoading || !user) {
    return <div className="cs-page"><div className="cs-loading"><div className="cs-spinner" /></div></div>
  }

  return (
    <div className="cs-page">
      <CustomerHeader
        actions={
          <button className="cs-btn cs-btn--ghost cs-btn--sm" onClick={handleLogout}>
            {t('common.logout')}
          </button>
        }
      />
      <div className="cs-shell">
        <div className="cs-intro">
          <div className="cs-eyebrow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {t('landing.role.customer')}
          </div>
          <h1 className="cs-h1">{t('customer.home.greeting')}, {user.first_name}</h1>
          <p className="cs-sub">
            {user.phone} · Trust Score {user.trust_score?.toFixed(0) ?? '—'}/100
          </p>
        </div>

        {wallet && (
          <div className="cs-card cs-card-pad">
            <div className="cs-card-label">💰 {t('customer.home.wallet')}</div>
            <div className="cs-tiles">
              <div className="cs-tile">
                <div className="v">{(wallet.active_deposits || 0).toLocaleString()} DA</div>
                <div className="l">{t('customer.home.active_deposits')}</div>
              </div>
              <div className="cs-tile">
                <div className="v">{(wallet.total_deposits || 0).toLocaleString()} DA</div>
                <div className="l">{t('customer.home.total_paid')}</div>
              </div>
              <div className="cs-tile">
                <div className="v">{wallet.order_count || 0}</div>
                <div className="l">{t('customer.home.orders_count')}</div>
              </div>
            </div>
          </div>
        )}

        <div className="cs-card cs-card-pad">
          <div className="cs-card-label">{t('customer.home.track_by_code')}</div>
          <form className="cs-inline-form" onSubmit={goTrackByCode}>
            <div className="cs-field">
              <label>{t('customer.home.tracking_code')}</label>
              <input
                className="cs-input"
                placeholder="SO-A1B2C3"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value)}
              />
            </div>
            <button type="submit" className="cs-btn cs-btn--outline">{t('customer.home.track')}</button>
          </form>
        </div>

        <div className="cs-card cs-card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="cs-card-label" style={{ margin: 0 }}>📅 Historique financier</div>
            <div className="cs-seg">
              {(['weekly', 'monthly'] as Period[]).map(p => (
                <button
                  key={p}
                  type="button"
                  className={period === p ? 'active' : ''}
                  onClick={() => setPeriod(p)}
                >
                  {p === 'weekly' ? t('customer.home.history.weekly') : t('customer.home.history.monthly')}
                </button>
              ))}
            </div>
          </div>

          {!history || history.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--cs-ink-3)', textAlign: 'center', padding: 16, margin: 0 }}>—</p>
          ) : (
            history.slice(0, 6).map(b => (
              <div key={b.key} className="cs-bucket">
                <div className="cs-bucket-head">
                  <div className="name">{b.label}</div>
                  <div className="meta">
                    {b.order_count} {t('customer.home.orders_count').toLowerCase()} · {b.delivered} ✅ · {b.returned} ↩
                  </div>
                </div>
                <div className="cs-tiles">
                  <div className="cs-tile">
                    <div className="v">{b.total_price.toLocaleString()} DA</div>
                    <div className="l">Total</div>
                  </div>
                  <div className="cs-tile">
                    <div className="v green">{b.total_deposit.toLocaleString()} DA</div>
                    <div className="l">{t('customer.home.history.deposit')}</div>
                  </div>
                  <div className="cs-tile">
                    <div className="v">{b.total_remaining.toLocaleString()} DA</div>
                    <div className="l">{t('customer.home.history.remaining')}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cs-card cs-card-pad">
          <div className="cs-card-label">{t('customer.home.my_orders')}</div>
          {loading ? (
            <div className="cs-loading" style={{ minHeight: 120 }}><div className="cs-spinner" /></div>
          ) : error ? (
            <div className="cs-error">{error}</div>
          ) : !orders || orders.length === 0 ? (
            <div className="cs-empty">
              <div className="ic">📦</div>
              <h3>{t('customer.home.no_orders.title')}</h3>
              <p>{t('customer.home.no_orders.desc')}</p>
            </div>
          ) : (
            orders.map((o: any) => (
              <div key={o.id} className="cs-order" onClick={() => navigate(`/track/${o.tracking_code}`)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="cs-order-code">{o.tracking_code}</span>
                    <span className={`cs-badge ${STATUS_TONE[o.status] || 'slate'}`}>{t(`status.${o.status}`)}</span>
                  </div>
                  <div className="cs-order-name">{o.product_name}</div>
                  <div className="cs-order-meta">
                    {new Date(o.created_at).toLocaleDateString()} · {o.product_price?.toLocaleString()} DA
                  </div>
                </div>
                <svg className="cs-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
