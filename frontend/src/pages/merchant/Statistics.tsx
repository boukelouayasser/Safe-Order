/**
 * Safe Order — Statistics Page (FR-07)
 * Delivery rate, return rate, best sellers, wilaya breakdown, feedbacks.
 */
import { useState, useEffect } from 'react'
import { statsApi } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import { Card, StatCard, Spinner } from '../../components/ui'

export default function Statistics() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.getDashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!stats) return <div>Impossible de charger les statistiques.</div>

  const { overview, current_month, revenue, best_sellers, wilaya_breakdown, recent_feedbacks, monthly_evolution } = stats
  const maxOrders = Math.max(1, ...((monthly_evolution || []).map((m: any) => m.orders)))

  return (
    <div>
      {/* Key Metrics */}
      <div className="grid grid--4" style={{ marginBottom: 28 }}>
        <StatCard
          label="Commandes totales"
          value={overview.total_orders}
          icon={<span style={{ fontSize: 20 }}>📦</span>}
        />
        <StatCard
          label="Taux de livraison"
          value={`${overview.delivery_rate}%`}
          icon={<span style={{ fontSize: 20 }}>✅</span>}
          color="var(--color-green)"
        />
        <StatCard
          label="Taux de retour"
          value={`${overview.return_rate}%`}
          change={overview.return_rate_change}
          icon={<span style={{ fontSize: 20 }}>↩️</span>}
          color="var(--color-danger)"
        />
        <StatCard
          label="Trust Score"
          value={`${overview.trust_score.toFixed(0)}/100`}
          icon={<span style={{ fontSize: 20 }}>🛡</span>}
          color="var(--color-primary)"
        />
      </div>

      <div className="grid grid--2" style={{ marginBottom: 28 }}>
        {/* Revenue */}
        <Card>
          <div className="order-detail__section-title">Revenus</div>
          <div className="order-detail__info-grid">
            <div className="order-detail__info-item">
              <span className="order-detail__info-label">CA total (livré)</span>
              <span className="order-detail__info-value" style={{ fontSize: 20 }}>
                {revenue.total.toLocaleString()} DA
              </span>
            </div>
            <div className="order-detail__info-item">
              <span className="order-detail__info-label">Safe Pay collecté</span>
              <span className="order-detail__info-value" style={{ fontSize: 20, color: 'var(--color-green)' }}>
                {revenue.safe_pay_collected.toLocaleString()} DA
              </span>
            </div>
          </div>
        </Card>

        {/* This Month */}
        <Card>
          <div className="order-detail__section-title">Ce mois-ci</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}>{current_month.orders}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Commandes</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-green)' }}>{current_month.delivered}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Livrées</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-danger)' }}>{current_month.returned}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Retours</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly evolution */}
      {monthly_evolution?.length > 0 && (
        <Card style={{ marginBottom: 28 }}>
          <div className="order-detail__section-title">Évolution mensuelle</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '8px 4px' }}>
            {monthly_evolution.map((m: any) => {
              const total = m.orders
              const deliveredH = total ? (m.delivered / maxOrders) * 130 : 0
              const returnedH = total ? (m.returned / maxOrders) * 130 : 0
              const otherH = total ? ((m.orders - m.delivered - m.returned) / maxOrders) * 130 : 0
              return (
                <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{m.orders}</div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 130, gap: 1 }}>
                    {returnedH > 0 && <div style={{ height: returnedH, background: '#ef4444', borderRadius: '2px 2px 0 0' }} />}
                    {otherH > 0 && <div style={{ height: otherH, background: '#94a3b8' }} />}
                    {deliveredH > 0 && <div style={{ height: deliveredH, background: '#10b981', borderRadius: returnedH || otherH ? 0 : '2px 2px 0 0' }} />}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', textTransform: 'capitalize' }}>{m.label}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b', marginTop: 8, justifyContent: 'center' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#10b981', borderRadius: 2, marginInlineEnd: 4 }} />Livré</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#94a3b8', borderRadius: 2, marginInlineEnd: 4 }} />En cours</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', borderRadius: 2, marginInlineEnd: 4 }} />Retour</span>
          </div>
        </Card>
      )}

      <div className="grid grid--2">
        {/* Best Sellers */}
        <Card>
          <div className="order-detail__section-title">Meilleures ventes</div>
          {best_sellers.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Aucune vente encore</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {best_sellers.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.order_count} commandes</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{item.revenue.toLocaleString()} DA</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Wilaya Breakdown */}
        <Card>
          <div className="order-detail__section-title">Répartition par wilaya</div>
          {wilaya_breakdown.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Aucune donnée</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wilaya_breakdown.map((w: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{w.wilaya}</div>
                    <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 2, marginTop: 4 }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--color-primary)',
                        borderRadius: 2,
                        width: `${(w.count / wilaya_breakdown[0].count) * 100}%`,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{w.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Feedbacks */}
      {recent_feedbacks?.length > 0 && (
        <Card style={{ marginTop: 20 }}>
          <div className="order-detail__section-title">Derniers avis clients</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recent_feedbacks.map((fb: any) => (
              <div key={fb.id} style={{ padding: 14, background: 'var(--color-bg-secondary)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{'⭐'.repeat(fb.rating)}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {new Date(fb.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {fb.comment && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{fb.comment}</p>}
                {fb.criteria?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {fb.criteria.map((c: string) => (
                      <span key={c} className="badge" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)', fontSize: 10 }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
