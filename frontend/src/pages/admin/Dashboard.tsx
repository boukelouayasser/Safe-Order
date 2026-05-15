/**
 * Safe Order — Minimal Admin Dashboard.
 * Read-only view of platform-wide stats, users and merchants.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import LanguagePicker from '../../components/LanguagePicker'
import { Card, Button, StatCard, Spinner } from '../../components/ui'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const t = useT()

  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user || user.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    Promise.all([
      api.get<any>('/api/admin/dashboard'),
      api.get<any[]>('/api/admin/users'),
      api.get<any[]>('/api/admin/merchants'),
    ])
      .then(([s, u, m]) => { setStats(s); setUsers(u); setMerchants(m) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoading, isAuthenticated, user, navigate])

  const handleLogout = () => { logout(); navigate('/', { replace: true }) }

  if (isLoading || loading || !user) return <Spinner />

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40, padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 920 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, background: '#0D3B66', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>⚙️</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0D3B66' }}>Admin · Safe Order</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LanguagePicker size="sm" />
            <Button variant="ghost" size="sm" onClick={handleLogout}>{t('common.logout')}</Button>
          </div>
        </div>

        {stats && (
          <>
            <div className="grid grid--4" style={{ marginBottom: 20 }}>
              <StatCard label="Merchants" value={stats.users.merchants} icon={<span>🏪</span>} />
              <StatCard label="Customers" value={stats.users.customers} icon={<span>🛒</span>} color="var(--color-green)" />
              <StatCard label="Orders" value={stats.orders.total} icon={<span>📦</span>} color="var(--color-gold)" />
              <StatCard label="Revenue delivered" value={`${stats.financial.total_revenue.toLocaleString()} DA`} icon={<span>💰</span>} />
            </div>

            <div className="grid grid--2" style={{ marginBottom: 20 }}>
              <Card>
                <div className="order-detail__section-title">📊 Performance</div>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{stats.orders.delivery_rate}%</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Delivery rate</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{stats.orders.return_rate}%</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Return rate</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.platform.avg_merchant_trust_score}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Average trust score</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="order-detail__section-title">💳 Safe Pay collected</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-green)', textAlign: 'center', padding: 12 }}>
                  {stats.financial.total_safe_pay_collected.toLocaleString()} DA
                </div>
              </Card>
            </div>
          </>
        )}

        <Card style={{ marginBottom: 16 }}>
          <div className="order-detail__section-title">🏪 Merchants ({merchants.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {merchants.slice(0, 8).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.store_name || `${m.first_name} ${m.last_name}`}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{m.email} · {m.phone}</div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 11 }}>
                  <div>{m.total_delivered}/{m.total_orders} delivered</div>
                  <div style={{ color: '#64748b' }}>Trust {m.trust_score?.toFixed(0)}/100</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="order-detail__section-title">👥 Recent users ({users.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.slice(0, 10).map((u: any) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
                <span>{u.first_name} {u.last_name} <span style={{ color: '#94a3b8' }}>({u.role})</span></span>
                <span style={{ color: '#64748b' }}>{u.phone}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
