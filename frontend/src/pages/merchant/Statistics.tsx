/**
 * Safe Order — Statistics Page (FR-07)
 * KPI row, revenue, monthly evolution chart, best sellers, wilaya breakdown.
 */
import { useState, useEffect } from 'react'
import { statsApi } from '../../api/endpoints'

export default function Statistics() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.getDashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="md-loading"><div className="md-spinner" /></div>
  }
  if (!stats) {
    return (
      <div className="md-card md-empty">
        <h3>Statistiques indisponibles</h3>
        <p>Impossible de charger les statistiques pour le moment.</p>
      </div>
    )
  }

  const { overview, current_month, revenue, best_sellers, wilaya_breakdown, monthly_evolution } = stats
  const months: any[] = monthly_evolution || []
  const maxTotal = Math.max(1, ...months.map(m => m.orders || 0))
  const sellers: any[] = best_sellers || []
  const wilayas: any[] = wilaya_breakdown || []
  const maxWilaya = Math.max(1, ...wilayas.map(w => w.count || 0))
  const returnChange = overview?.return_rate_change

  return (
    <>
      {/* KPI row */}
      <div className="md-kpi-grid">
        <div className="md-card md-kpi">
          <div className="md-kpi-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">{overview?.total_orders ?? 0}</div>
            <div className="md-kpi-label">Total orders</div>
          </div>
        </div>

        <div className="md-card md-kpi">
          <div className="md-kpi-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">{overview?.delivery_rate ?? 0}%</div>
            <div className="md-kpi-label">Delivery rate</div>
          </div>
        </div>

        <div className="md-card md-kpi">
          <div className="md-kpi-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">{overview?.return_rate ?? 0}%</div>
            <div className="md-kpi-label">Taux de retour</div>
            {returnChange != null && returnChange !== 0 && (
              <div className={`md-kpi-delta ${returnChange > 0 ? 'down' : ''}`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points={returnChange > 0 ? '6 9 12 15 18 9' : '18 15 12 9 6 15'} />
                </svg>
                {returnChange > 0 ? '+' : ''}{returnChange}%
              </div>
            )}
          </div>
        </div>

        <div className="md-card md-kpi">
          <div className="md-kpi-icon slate">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <div>
            <div className="md-kpi-value">
              {Math.round(overview?.trust_score ?? 0)}
              <span style={{ color: 'var(--md-ink-3)', fontWeight: 500, fontSize: 18 }}>/100</span>
            </div>
            <div className="md-kpi-label">Trust Score</div>
          </div>
        </div>
      </div>

      {/* Revenue + month */}
      <div className="md-rev-grid">
        <div className="md-card md-card-pad">
          <div className="md-section-label">Revenus</div>
          <div className="md-rev-row">
            <div className="md-rev-block">
              <div className="label">Total Revenue (Delivered)</div>
              <div className="val">
                {(revenue?.total ?? 0).toLocaleString()} <span className="unit">DA</span>
              </div>
              <div className="sub">Current period · successful deliveries</div>
            </div>
            <div className="md-rev-block">
              <div className="label">Safe Pay Collected</div>
              <div className="val green">
                {(revenue?.safe_pay_collected ?? 0).toLocaleString()} <span className="unit">DA</span>
              </div>
              <div className="sub">Total protected via Safe Pay</div>
            </div>
          </div>
        </div>

        <div className="md-card md-card-pad">
          <div className="md-section-label">This month</div>
          <div className="md-month-row">
            <div className="md-month-cell blue"><div className="v">{current_month?.orders ?? 0}</div><div className="l">Orders</div></div>
            <div className="md-month-cell green"><div className="v">{current_month?.delivered ?? 0}</div><div className="l">Delivered</div></div>
            <div className="md-month-cell red"><div className="v">{current_month?.returned ?? 0}</div><div className="l">Returns</div></div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {months.length > 0 && (
        <div className="md-card md-chart-card">
          <div>
            <div className="md-section-label" style={{ marginBottom: 4 }}>Monthly evolution</div>
            <div style={{ fontSize: 13, color: 'var(--md-ink-3)' }}>
              Order volume by status · last {months.length} months
            </div>
          </div>

          <div className="md-chart-wrap">
            <div className="md-chart" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
              {months.map(m => {
                const tot = m.orders || 0
                const delivered = m.delivered || 0
                const returned = m.returned || 0
                const pending = Math.max(0, tot - delivered - returned)
                const scale = (tot / maxTotal) * 100
                const h = (part: number) => (tot > 0 ? (part / tot) * scale : 0)
                return (
                  <div className="md-chart-col" key={m.key || m.label}>
                    <div className="total">{tot}</div>
                    {delivered > 0 && <div className="bar delivered" style={{ height: `${h(delivered)}%` }} />}
                    {pending > 0 && <div className="bar pending" style={{ height: `${h(pending)}%` }} />}
                    {returned > 0 && <div className="bar returned" style={{ height: `${h(returned)}%` }} />}
                    <div className="lab">{m.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="md-legend">
            <span className="li"><span className="sw" style={{ background: 'var(--md-green-2)' }} />Delivered</span>
            <span className="li"><span className="sw" style={{ background: 'linear-gradient(180deg,#94a3b8,#64748b)' }} />En cours</span>
            <span className="li"><span className="sw" style={{ background: 'var(--md-red)' }} />Retour</span>
          </div>
        </div>
      )}

      {/* Best sellers + wilaya */}
      <div className="md-two-col">
        <div className="md-card md-card-pad">
          <div className="md-section-label">Meilleures ventes</div>
          {sellers.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--md-ink-3)', margin: 0 }}>Aucune vente encore.</p>
          ) : (
            <div className="md-seller-list">
              {sellers.map((item, i) => (
                <div className="md-seller-row" key={i}>
                  <div className="md-rank">{i + 1}</div>
                  <div>
                    <div className="md-seller-name">{item.product_name}</div>
                    <div className="md-seller-meta">
                      {item.order_count} order{item.order_count > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="md-seller-amount">{(item.revenue ?? 0).toLocaleString()} DA</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md-card md-card-pad">
          <div className="md-section-label">Distribution by province</div>
          {wilayas.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--md-ink-3)', margin: 0 }}>No data.</p>
          ) : (
            wilayas.map((w, i) => (
              <div className="md-wilaya-row" key={i}>
                <div className="md-wilaya-head">
                  <span>{w.wilaya}</span>
                  <span className="v">{w.count}</span>
                </div>
                <div className="md-wilaya-bar">
                  <div className="fill" style={{ width: `${Math.max(3, (w.count / maxWilaya) * 100)}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
