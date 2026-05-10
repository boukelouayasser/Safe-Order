/**
 * Safe Order — Customer hub page (FR-12 Cart + FR-15 Wallet entry).
 * Auth-gated; auto-loads orders, wallet summary, and weekly/monthly history.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackingApi, paymentsApi } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import LanguagePicker from '../../components/LanguagePicker'
import { Card, Button, Input, StatusBadge, Spinner, EmptyState } from '../../components/ui'

type Period = 'weekly' | 'monthly'

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
    if (user.role !== 'customer') {
      navigate('/', { replace: true })
    }
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

  if (isLoading || !user) return <Spinner />

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, background: '#0080ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>🛒</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0D3B66', lineHeight: 1.1 }}>
                {t('customer.home.greeting')}, {user.first_name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {user.phone} — Trust Score {user.trust_score?.toFixed(0) ?? '—'}/100
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LanguagePicker size="sm" />
            <Button variant="ghost" size="sm" onClick={handleLogout}>{t('common.logout')}</Button>
          </div>
        </div>

        {wallet && (
          <Card padding="md" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
              💰 {t('customer.home.wallet')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>{t('customer.home.active_deposits')}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{(wallet.active_deposits || 0).toLocaleString()} DA</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>{t('customer.home.total_paid')}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{(wallet.total_deposits || 0).toLocaleString()} DA</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>{t('customer.home.orders_count')}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{wallet.order_count || 0}</div>
              </div>
            </div>
          </Card>
        )}

        <Card padding="md" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
            {t('customer.home.track_by_code')}
          </div>
          <form onSubmit={goTrackByCode} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Input
              label={t('customer.home.tracking_code')}
              placeholder="SO-A1B2C3"
              value={trackCode}
              onChange={e => setTrackCode(e.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <Button type="submit" variant="outline">{t('customer.home.track')}</Button>
          </form>
        </Card>

        {/* Wallet history (FR-10): weekly / monthly toggle */}
        <Card padding="md" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              📅 Historique financier
            </div>
            <div style={{ display: 'inline-flex', padding: 3, background: '#f1f5f9', borderRadius: 999 }}>
              {(['weekly', 'monthly'] as Period[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 999,
                    border: 'none', cursor: 'pointer',
                    background: period === p ? '#0080ff' : 'transparent',
                    color: period === p ? '#fff' : '#475569',
                  }}
                >
                  {p === 'weekly' ? t('customer.home.history.weekly') : t('customer.home.history.monthly')}
                </button>
              ))}
            </div>
          </div>

          {!history || history.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 20 }}>—</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.slice(0, 6).map(b => (
                <div key={b.key} style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {b.order_count} {t('customer.home.orders_count').toLowerCase()} ·
                      {' '}{b.delivered} ✅ · {b.returned} ↩
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>Total</div>
                      <div style={{ fontWeight: 700 }}>{b.total_price.toLocaleString()} DA</div>
                    </div>
                    <div>
                      <div style={{ color: '#0D6E3F', fontSize: 10 }}>{t('customer.home.history.deposit')}</div>
                      <div style={{ fontWeight: 700, color: '#0D6E3F' }}>{b.total_deposit.toLocaleString()} DA</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>{t('customer.home.history.remaining')}</div>
                      <div style={{ fontWeight: 700 }}>{b.total_remaining.toLocaleString()} DA</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md">
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>
            {t('customer.home.my_orders')}
          </div>
          {loading ? (
            <Spinner />
          ) : error ? (
            <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
          ) : !orders || orders.length === 0 ? (
            <EmptyState
              title={t('customer.home.no_orders.title')}
              description={t('customer.home.no_orders.desc')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map((o: any) => (
                <div
                  key={o.id}
                  style={{ padding: 14, background: '#f8fafc', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => navigate(`/track/${o.tracking_code}`)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0080ff', fontSize: 13 }}>{o.tracking_code}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {o.product_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {new Date(o.created_at).toLocaleDateString()} · {o.product_price?.toLocaleString()} DA
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: '#94a3b8' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
