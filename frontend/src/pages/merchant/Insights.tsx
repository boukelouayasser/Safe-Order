/**
 * Safe Order — Safe Insights Page (FR-08)
 * AI analysis: return-cause breakdown + personalised recommendations.
 */
import { useState, useEffect } from 'react'
import { statsApi } from '../../api/endpoints'

const RING_CIRC = 2 * Math.PI * 40 // r = 40

const PRIORITY_META: Record<string, { cls: 'warn' | 'good'; tag: string }> = {
  high: { cls: 'warn', tag: 'Prioritaire' },
  medium: { cls: 'warn', tag: 'Recommandé' },
  low: { cls: 'good', tag: 'Optionnel' },
}

export default function Insights() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.getInsights()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="md-loading"><div className="md-spinner" /></div>
  }

  if (!data?.available) {
    return (
      <div className="md-card md-empty">
        <div className="ic">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3>Safe Insights pas encore disponible</h3>
        <p>{data?.message || "L'analyse IA est disponible à partir de 10 commandes."}</p>
        {data?.orders_needed ? (
          <p style={{ marginTop: 10, color: 'var(--md-blue-700)', fontWeight: 600 }}>
            Encore {data.orders_needed} commande{data.orders_needed > 1 ? 's' : ''} nécessaire{data.orders_needed > 1 ? 's' : ''}.
          </p>
        ) : null}
      </div>
    )
  }

  const causes: any[] = data.cause_breakdown || []
  const recos: any[] = data.recommendations || []
  const totalReturns = data.total_returns_analyzed || 0
  const trust = Math.round(data.trust_score ?? 0)
  const ringOffset = RING_CIRC * (1 - Math.min(100, Math.max(0, trust)) / 100)

  return (
    <>
      {/* Stat cards */}
      <div className="md-insights-grid">
        <div className="md-card md-insight-stat blue">
          <div>
            <div className="big">{totalReturns}</div>
            <div className="l">Retours analysés</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div className="md-kpi-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
            </div>
          </div>
        </div>

        <div className="md-card md-insight-stat amber">
          <div>
            <div className="big">{causes.length}</div>
            <div className="l">Causes identifiées</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div className="md-kpi-icon amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
          </div>
        </div>

        <div className="md-card md-insight-stat">
          <div className="md-ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle className="ring-bg" cx="48" cy="48" r="40" strokeWidth="8" fill="none" />
              <circle
                className="ring-fg" cx="48" cy="48" r="40" strokeWidth="8" fill="none"
                strokeDasharray={RING_CIRC.toFixed(1)}
                strokeDashoffset={ringOffset.toFixed(1)}
              />
            </svg>
            <div className="center">{trust}<span className="max">/ 100</span></div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--md-ink-3)', fontWeight: 500, marginBottom: 6 }}>Score global</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Trust Score</div>
          </div>
        </div>
      </div>

      {/* Causes + recommendations */}
      <div className="md-insights-two">
        <div className="md-card md-card-pad">
          <div className="md-ic-head">
            <span className="ico blue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
            Causes de retour
          </div>

          {causes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--md-ink-3)', margin: 0 }}>
              Aucune cause identifiée pour l'instant.
            </p>
          ) : (
            causes.map((cause, i) => {
              const pct = totalReturns > 0 ? Math.round((cause.count / totalReturns) * 100) : 0
              return (
                <div className="md-cause-item" key={i}>
                  <div className="n">{i + 1}</div>
                  <div>
                    <div className="title">{cause.label_fr || cause.cause}</div>
                    <div className="sub">{cause.cause}</div>
                  </div>
                  <div className="pct">{pct}%</div>
                </div>
              )
            })
          )}
        </div>

        <div className="md-card md-card-pad">
          <div className="md-ic-head">
            <span className="ico amber">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21h6" /><path d="M12 17v4" /><path d="M7 8a5 5 0 0 1 10 0c0 2-1.5 3.5-2.5 5s-1.5 2-1.5 4h-2c0-2-.5-2.5-1.5-4S7 10 7 8z" /></svg>
            </span>
            Recommandations IA
          </div>

          {recos.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--md-ink-3)', margin: 0 }}>
              Aucune recommandation pour l'instant.
            </p>
          ) : (
            recos.map((rec, i) => {
              const meta = PRIORITY_META[rec.priority] || PRIORITY_META.medium
              return (
                <div className={`md-reco-item ${meta.cls}`} key={i}>
                  <div className="head-mini">
                    {meta.cls === 'good' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    )}
                    {rec.title}
                  </div>
                  <p>{rec.description}</p>
                  <span className={`md-reco-tag ${meta.cls === 'good' ? 'good' : ''}`}>{meta.tag}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
