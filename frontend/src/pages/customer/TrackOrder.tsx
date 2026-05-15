/**
 * Safe Order — Customer order tracking page.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trackingApi, feedbackApi } from '../../api/endpoints'
import { useT } from '../../i18n'
import CustomerHeader from '../../components/CustomerHeader'

const FEEDBACK_CRITERIA = [
  { value: 'conforming', label: '✅ Conforme' },
  { value: 'fast_delivery', label: '⚡ Livraison rapide' },
  { value: 'good_packaging', label: '📦 Well packaged' },
  { value: 'damaged', label: '❌ Damaged' },
  { value: 'different_color', label: '�愈 Different color' },
  { value: 'non_conforming', label: '⚠️ Non conforme' },
]

const STATUS_TONE: Record<string, string> = {
  confirmation: 'blue',
  preparation: 'amber',
  dispatch: 'slate',
  delivery: 'blue',
  delivered: 'green',
  return_processed: 'red',
}

function StatusPill({ status }: { status: string }) {
  const t = useT()
  return <span className={`cs-badge ${STATUS_TONE[status] || 'slate'}`}>{t(`status.${status}`)}</span>
}

export default function TrackOrder() {
  const { code: urlCode } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [code, setCode] = useState(urlCode || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remark, setRemark] = useState('')
  const [remarkPhone, setRemarkPhone] = useState(localStorage.getItem('customer_phone') || '')
  const [remarkSent, setRemarkSent] = useState(false)

  const [feedback, setFeedback] = useState<any | null>(null)
  const [fbRating, setFbRating] = useState(5)
  const [fbCriteria, setFbCriteria] = useState<string[]>([])
  const [fbComment, setFbComment] = useState('')
  const [fbSubmitting, setFbSubmitting] = useState(false)
  const [fbDone, setFbDone] = useState(false)

  useEffect(() => { if (urlCode) doTrack(urlCode) }, [urlCode])

  const doTrack = async (c: string) => {
    setLoading(true); setError('')
    try {
      const res = await trackingApi.track(c.toUpperCase())
      setData(res)
      if (res?.order?.status === 'delivered' && res.order.id) {
        try {
          const fb = await feedbackApi.getByOrder(res.order.id)
          setFeedback(fb)
          setFbDone(true)
        } catch { /* no feedback yet */ }
      }
    } catch {
      setError('Code invalide')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleCriteria = (v: string) =>
    setFbCriteria(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const submitFeedback = async () => {
    if (!data?.order?.id) return
    setFbSubmitting(true)
    try {
      await feedbackApi.submit({
        order_id: data.order.id,
        rating: fbRating,
        criteria: fbCriteria,
        comment: fbComment || undefined,
      })
      setFbDone(true)
    } catch (err: any) {
      setError(err.message || 'Error submitting')
    } finally {
      setFbSubmitting(false)
    }
  }

  const order = data?.order
  const events: any[] = data?.events || []

  return (
    <div className="cs-page">
      <CustomerHeader
        actions={
          <button className="cs-btn cs-btn--ghost cs-btn--sm" onClick={() => navigate('/customer')}>
            ← Mon espace
          </button>
        }
      />
      <div className="cs-shell mid">
        <div className="cs-intro">
          <div className="cs-eyebrow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Real-time tracking
          </div>
          <h1 className="cs-h1">Suivre ma commande</h1>
          <p className="cs-sub">Enter your tracking code to see your package progress.</p>
        </div>

        <div className="cs-card cs-card-pad">
          <form
            className="cs-inline-form"
            onSubmit={e => { e.preventDefault(); if (code.trim()) doTrack(code.trim()) }}
          >
            <div className="cs-field">
              <label>Code de suivi</label>
              <input
                className="cs-input"
                placeholder="SO-A1B2C3"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>
            <button type="submit" className="cs-btn cs-btn--primary" disabled={loading}>
              {loading ? <span className="cs-btn-spinner" /> : 'Suivre'}
            </button>
          </form>
          {error && <div className="cs-error" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        {order && (
          <>
            <div className="cs-card cs-card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div className="cs-card-label" style={{ margin: '0 0 4px' }}>Commande</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--cs-blue-600)' }}>{order.tracking_code}</div>
                </div>
                <StatusPill status={order.status} />
              </div>
              <div className="cs-product">
                <div className="pname">{order.product_name}</div>
                <div className="cs-price-row">
                  <div className="cs-price">
                    <div className="k">Prix</div>
                    <div className="v">{order.product_price.toLocaleString()} DA</div>
                  </div>
                  {order.safe_pay_amount > 0 && (
                    <div className="cs-price green">
                      <div className="k">Acompte Safe Pay</div>
                      <div className="v">{order.safe_pay_amount.toLocaleString()} DA</div>
                    </div>
                  )}
                </div>
              </div>
              {data.estimated_delivery && (
                <div className="cs-note" style={{ marginTop: 12 }}>
                  ⏰ Estimated delivery: {data.estimated_delivery}
                </div>
              )}
            </div>

            <div className="cs-card cs-card-pad">
              <div className="cs-card-label">Historique</div>
              <div className="cs-timeline">
                {events.map((evt, i) => (
                  <div key={evt.id} className="cs-tl-item">
                    <div className={`cs-tl-dot ${i === events.length - 1 ? 'active' : ''} ${evt.status === 'delivered' ? 'success' : ''} ${evt.status === 'return_processed' ? 'danger' : ''}`} />
                    <div className="cs-tl-time">
                      {new Date(evt.created_at).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <StatusPill status={evt.status} />
                    {evt.note && <div className="cs-tl-note">{evt.note}</div>}
                  </div>
                ))}
              </div>
            </div>

            {order.status === 'delivered' && (
              <div className="cs-card cs-card-pad">
                <div className="cs-card-label">⭐ Votre avis</div>
                {fbDone || feedback ? (
                  <div className="cs-success">
                    ✓ Thank you! Your rating ({feedback?.rating ?? fbRating}/5) has been recorded.
                  </div>
                ) : (
                  <div className="cs-form">
                    <div className="cs-stars">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          className={`cs-star ${fbRating >= n ? 'on' : ''}`}
                          onClick={() => setFbRating(n)}
                        >
                          {fbRating >= n ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                    <div className="cs-chips">
                      {FEEDBACK_CRITERIA.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          className={`cs-chip ${fbCriteria.includes(c.value) ? 'on' : ''}`}
                          onClick={() => toggleCriteria(c.value)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="cs-textarea"
                      rows={2}
                      placeholder="Commentaire (optionnel)"
                      value={fbComment}
                      onChange={e => setFbComment(e.target.value)}
                    />
                    <button className="cs-btn cs-btn--primary cs-btn--block" onClick={submitFeedback} disabled={fbSubmitting}>
                      {fbSubmitting ? <span className="cs-btn-spinner" /> : 'Envoyer mon avis'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="cs-card cs-card-pad">
              <div className="cs-card-label">💬 Add a note</div>
              {remarkSent ? (
                <div className="cs-success">✓ Note sent</div>
              ) : (
                <div className="cs-form">
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>Your phone</label>
                    <input className="cs-input" placeholder="0551234567" value={remarkPhone} onChange={e => setRemarkPhone(e.target.value)} />
                  </div>
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>Note</label>
                    <input className="cs-input" placeholder="Ex: available after 5 PM..." value={remark} onChange={e => setRemark(e.target.value)} />
                  </div>
                  <button
                    className="cs-btn cs-btn--outline cs-btn--block"
                    onClick={async () => {
                      if (!remark || !remarkPhone) return
                      try {
                        await trackingApi.addRemark(order.tracking_code, remark, remarkPhone)
                        setRemarkSent(true)
                      } catch (err: any) {
                        setError(err.message || 'Error')
                      }
                    }}
                  >
                    Envoyer
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
