/**
 * Safe Order — Merchant Dashboard (FR-04, FR-07)
 * KPI overview + 6-stage pipeline + pending-orders table.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersApi, PipelineCounts, OrderSummary, OrderBadge } from '../../api/orders'
import { statsApi } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'

const PIPELINE_STAGES = [
  { key: 'confirmation', label: 'Confirmation', cls: 's-conf' },
  { key: 'preparation', label: 'Préparation', cls: 's-prep' },
  { key: 'dispatch', label: 'Expédition', cls: 's-ship' },
  { key: 'delivery', label: 'Livraison', cls: 's-deliv' },
  { key: 'delivered', label: 'Livré', cls: 's-done' },
  { key: 'return_processed', label: 'Retour', cls: 's-return' },
] as const

const STAGE_ICON: Record<string, JSX.Element> = {
  confirmation: <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  preparation: <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
  dispatch: <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h13v10H3zM16 10h4l3 3v4h-7" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="18.5" cy="17.5" r="2" /></svg>,
  delivery: <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3" /><path d="M12 22s-8-7-8-13a8 8 0 0 1 16 0c0 6-8 13-8 13z" /></svg>,
  delivered: <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  return_processed: <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>,
}

const BADGE_META: Record<OrderBadge, { cls: string; label: string }> = {
  safe_pay: { cls: 'md-b-safepay', label: 'Safe Pay' },
  new: { cls: 'md-b-call', label: 'New (call)' },
  loyal: { cls: 'md-b-loyal', label: 'Loyal' },
  risk: { cls: 'md-b-risk', label: 'Risk' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { merchantProfile } = useAuth()
  const [counts, setCounts] = useState<PipelineCounts | null>(null)
  const [activeStage, setActiveStage] = useState<string>('confirmation')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      ordersApi.getPipelineCounts().catch(() => null),
      statsApi.getDashboard().catch(() => null),
    ])
      .then(([c, s]) => { setCounts(c); setStats(s) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    ordersApi.getByStatus(activeStage).then(setOrders).catch(() => setOrders([]))
  }, [activeStage])

  if (loading) {
    return <div className="md-loading"><div className="md-spinner" /></div>
  }

  const overview = stats?.overview
  const totalOrders = overview?.total_orders ?? merchantProfile?.total_orders ?? 0
  const deliveryRate = overview?.delivery_rate ?? 0
  const returnRate = overview?.return_rate ?? 0
  const returnChange = overview?.return_rate_change
  const avgRating = overview?.avg_rating ?? 0
  const activeLabel = PIPELINE_STAGES.find(s => s.key === activeStage)?.label ?? ''

  return (
    <>
      {/* KPI */}
      <div className="md-kpi-grid">
        <div className="md-card md-kpi">
          <div className="md-kpi-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">{totalOrders}</div>
            <div className="md-kpi-label">Total orders</div>
          </div>
        </div>

        <div className="md-card md-kpi">
          <div className="md-kpi-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">{deliveryRate}%</div>
            <div className="md-kpi-label">Delivery rate</div>
          </div>
        </div>

        <div className="md-card md-kpi">
          <div className="md-kpi-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">{returnRate}%</div>
            <div className="md-kpi-label">Return rate</div>
            {returnChange != null && returnChange !== 0 && (
              <div className={`md-kpi-delta ${returnChange > 0 ? 'down' : ''}`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points={returnChange > 0 ? '6 9 12 15 18 9' : '18 15 12 9 6 15'} />
                </svg>
                {returnChange > 0 ? '+' : ''}{returnChange}% MoM
              </div>
            )}
          </div>
        </div>

        <div className="md-card md-kpi">
          <div className="md-kpi-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2l2.95 6.91L22 9.27l-5.18 5.05L18.18 22 12 18.27 5.82 22l1.36-7.68L2 9.27l7.05-.36L12 2z" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">
              {avgRating}<span style={{ color: 'var(--md-ink-3)', fontWeight: 500 }}>/5</span>
            </div>
            <div className="md-kpi-label">Average rating</div>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="md-pipeline">
        {PIPELINE_STAGES.map(stage => {
          const count = counts?.[stage.key as keyof PipelineCounts] ?? 0
          return (
            <div
              key={stage.key}
              className={`md-pipe ${stage.cls} ${activeStage === stage.key ? 'active' : ''}`}
              onClick={() => setActiveStage(stage.key)}
            >
              {STAGE_ICON[stage.key]}
              <div className="n">{count}</div>
              <div className="l">{stage.label}</div>
            </div>
          )
        })}
      </div>

      {/* Orders table */}
      <div className="md-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div>
            <div className="md-section-label" style={{ margin: '0 0 4px' }}>{activeLabel}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </div>
          </div>
          <button className="md-toolbtn primary" onClick={() => navigate('/merchant/create-order')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New order
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="md-empty">
            <div className="ic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            </div>
            <h3>No orders</h3>
            <p>No order is currently in &ldquo;{activeLabel}&rdquo;.</p>
          </div>
        ) : (
          <div className="md-table-wrap" style={{ marginTop: 16 }}>
            <table className="md-orders">
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
                {orders.map(order => {
                  const badge = order.badge ? BADGE_META[order.badge] : null
                  return (
                    <tr key={order.id} onClick={() => navigate(`/merchant/orders/${order.id}`)}>
                      <td><span className="md-code-link">{order.tracking_code}</span></td>
                      <td className="md-prod-cell">{order.product_name}</td>
                      <td>
                        {order.customer_first_name
                          ? `${order.customer_first_name} ${order.customer_last_name || ''}`
                          : <span className="md-mute">—</span>}
                      </td>
                      <td>{order.customer_wilaya || <span className="md-mute">—</span>}</td>
                      <td className="md-num">{order.product_price.toLocaleString()} DA</td>
                      <td>
                        {order.safe_pay_amount > 0
                          ? <span className="md-num-g">{order.safe_pay_amount.toLocaleString()} DA</span>
                          : <span className="md-mute">—</span>}
                      </td>
                      <td>{badge ? <span className={`md-badge ${badge.cls}`}>{badge.label}</span> : <span className="md-mute">—</span>}</td>
                      <td>{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
