/**
 * Safe Order — Safe Insights Page (FR-08)
 * AI analysis: return causes breakdown + personalized recommendations.
 */
import { useState, useEffect } from 'react'
import { statsApi } from '../../api/endpoints'
import { Card, Spinner, EmptyState } from '../../components/ui'

export default function Insights() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.getInsights()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  if (!data?.available) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <Card padding="lg">
          <span style={{ fontSize: 48 }}>🔒</span>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>
            Safe Insights pas encore disponible
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {data?.message || "L'analyse IA est disponible à partir de 10 commandes."}
          </p>
          {data?.orders_needed && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--color-primary-50)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}>
                Encore {data.orders_needed} commande{data.orders_needed > 1 ? 's' : ''} nécessaire{data.orders_needed > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Header Stats */}
      <div className="grid grid--3" style={{ marginBottom: 28 }}>
        <Card padding="sm">
          <div style={{ textAlign: 'center', padding: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-primary)' }}>
              {data.total_returns_analyzed}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Retours analysés</div>
          </div>
        </Card>
        <Card padding="sm">
          <div style={{ textAlign: 'center', padding: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-gold)' }}>
              {data.cause_breakdown?.length || 0}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Causes identifiées</div>
          </div>
        </Card>
        <Card padding="sm">
          <div style={{ textAlign: 'center', padding: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {data.trust_score?.toFixed(0) || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Trust Score</div>
          </div>
        </Card>
      </div>

      <div className="grid grid--2">
        {/* Causes */}
        <Card>
          <div className="order-detail__section-title">🔍 Causes de retour</div>
          {(!data.cause_breakdown || data.cause_breakdown.length === 0) ? (
            <EmptyState title="Aucune cause identifiée" description="Les causes apparaîtront après l'analyse de vos retours." />
          ) : (
            <div className="insights__cause-list">
              {data.cause_breakdown.map((cause: any, i: number) => (
                <div key={i} className="insights__cause">
                  <div className="insights__cause-bar">{cause.count}</div>
                  <div className="insights__cause-info">
                    <div className="insights__cause-name">{cause.label_fr}</div>
                    <div className="insights__cause-count">{cause.cause}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recommendations */}
        <Card>
          <div className="order-detail__section-title">💡 Recommandations IA</div>
          {(!data.recommendations || data.recommendations.length === 0) ? (
            <EmptyState title="Pas de recommandation" description="Les recommandations sont générées automatiquement." />
          ) : (
            <div>
              {data.recommendations.map((rec: any, i: number) => (
                <div key={i} className="insights__rec">
                  <div className="insights__rec-title">{rec.title}</div>
                  <div className="insights__rec-desc">{rec.description}</div>
                  <span className={`insights__rec-priority insights__rec-priority--${rec.priority}`}>
                    {rec.priority === 'high' ? 'Prioritaire' : rec.priority === 'medium' ? 'Recommandé' : 'Optionnel'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
