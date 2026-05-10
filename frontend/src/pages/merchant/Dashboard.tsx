/**
 * Safe Order — Merchant Dashboard (FR-04, FR-07)
 * 6-category pipeline + key stats overview.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersApi, PipelineCounts, OrderSummary } from '../../api/orders'
import { statsApi } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import { Card, OrderBadge, StatusBadge, StatCard, Spinner, EmptyState } from '../../components/ui'

const PIPELINE_STAGES = [
  { key: 'confirmation', label: 'Confirmation', color: '#0080ff' },
  { key: 'preparation', label: 'Préparation', color: '#f59e0b' },
  { key: 'dispatch', label: 'Expédition', color: '#8b5cf6' },
  { key: 'delivery', label: 'Livraison', color: '#06b6d4' },
  { key: 'delivered', label: 'Livré', color: '#10b981' },
  { key: 'return_processed', label: 'Retour', color: '#ef4444' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, merchantProfile } = useAuth()
  const [counts, setCounts] = useState<PipelineCounts | null>(null)
  const [activeStage, setActiveStage] = useState('confirmation')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [stats, setStats] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadOrders(activeStage)
  }, [activeStage])

  const loadData = async () => {
    try {
      const [c, s, a] = await Promise.all([
        ordersApi.getPipelineCounts(),
        statsApi.getDashboard().catch(() => null),
        ordersApi.getDMinus1Alerts().catch(() => ({ alerts: [] })),
      ])
      setCounts(c)
      setStats(s)
      setAlerts(a.alerts || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async (stage: string) => {
    try {
      const data = await ordersApi.getByStatus(stage)
      setOrders(data)
    } catch {
      setOrders([])
    }
  }

  if (loading) return <Spinner />

  const overview = stats?.overview

  return (
    <div>
      {/* Stats Row */}
      <div className="grid grid--4" style={{ marginBottom: 28 }}>
        <StatCard
          label="Total commandes"
          value={overview?.total_orders ?? merchantProfile?.total_orders ?? 0}
          icon={<span style={{ fontSize: 20 }}>📦</span>}
        />
        <StatCard
          label="Taux de livraison"
          value={`${overview?.delivery_rate ?? 0}%`}
          icon={<span style={{ fontSize: 20 }}>✅</span>}
          color="var(--color-green)"
        />
        <StatCard
          label="Taux de retour"
          value={`${overview?.return_rate ?? 0}%`}
          change={overview?.return_rate_change}
          icon={<span style={{ fontSize: 20 }}>↩️</span>}
          color="var(--color-danger)"
        />
        <StatCard
          label="Note moyenne"
          value={`${overview?.avg_rating ?? 0}/5`}
          icon={<span style={{ fontSize: 20 }}>⭐</span>}
          color="var(--color-gold)"
        />
      </div>

      {/* D-1 alerts */}
      {alerts.length > 0 && (
        <Card padding="md" style={{ marginBottom: 20, borderInlineStart: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              Alertes livraison ({alerts.length})
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.slice(0, 5).map(a => (
              <div
                key={a.order_id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 10, borderRadius: 8,
                  background: a.is_d_minus_1 ? '#fef3cd' : '#f8fafc',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/merchant/orders/${a.order_id}`)}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0080ff' }}>{a.tracking_code}</div>
                  <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.customer_name} — {a.product_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                    « {a.remark} »
                  </div>
                </div>
                <div style={{ textAlign: 'end', flexShrink: 0, marginInlineStart: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: a.is_d_minus_1 ? '#92400e' : '#0f172a' }}>
                    {new Date(a.delivery_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                  <div style={{ fontSize: 10, color: a.is_d_minus_1 ? '#92400e' : '#64748b' }}>
                    {a.is_d_minus_1 ? '⚠ D-1' : `J+${a.days_until}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pipeline */}
      <div className="pipeline">
        {PIPELINE_STAGES.map(stage => {
          const count = counts?.[stage.key as keyof PipelineCounts] ?? 0
          return (
            <div
              key={stage.key}
              className={`pipeline__card ${activeStage === stage.key ? 'pipeline__card--active' : ''}`}
              onClick={() => setActiveStage(stage.key)}
            >
              <div className="pipeline__count" style={{ color: stage.color }}>
                {count}
              </div>
              <div className="pipeline__label">{stage.label}</div>
            </div>
          )
        })}
      </div>

      {/* Orders List */}
      <Card padding="sm">
        {orders.length === 0 ? (
          <EmptyState
            title="Aucune commande"
            description={`Aucune commande en "${PIPELINE_STAGES.find(s => s.key === activeStage)?.label}"`}
          />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Produit</th>
                  <th>Client</th>
                  <th>Wilaya</th>
                  <th>Prix</th>
                  <th>Safe Pay</th>
                  <th>Badge</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr
                    key={order.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/merchant/orders/${order.id}`)}
                  >
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 13 }}>
                        {order.tracking_code}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.product_name}
                    </td>
                    <td>
                      {order.customer_first_name
                        ? `${order.customer_first_name} ${order.customer_last_name || ''}`
                        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: 13 }}>{order.customer_wilaya || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{order.product_price.toLocaleString()} DA</td>
                    <td style={{ fontWeight: 500, color: order.safe_pay_amount > 0 ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                      {order.safe_pay_amount > 0 ? `${order.safe_pay_amount.toLocaleString()} DA` : '—'}
                    </td>
                    <td><OrderBadge badge={order.badge} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
