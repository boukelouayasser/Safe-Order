import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trackingApi, feedbackApi } from '../../api/endpoints'
import { Card, StatusBadge, Button, Input, Spinner } from '../../components/ui'
import LanguagePicker from '../../components/LanguagePicker'

const FEEDBACK_CRITERIA = [
  { value: 'conforming', label: '✅ Conforme' },
  { value: 'fast_delivery', label: '⚡ Livraison rapide' },
  { value: 'good_packaging', label: '📦 Bien emballé' },
  { value: 'damaged', label: '❌ Endommagé' },
  { value: 'different_color', label: '🎨 Couleur différente' },
  { value: 'non_conforming', label: '⚠️ Non conforme' },
]

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

  // Feedback state
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
      // Pre-load existing feedback if delivered
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
      setError(err.message || 'Erreur lors de la soumission')
    } finally {
      setFbSubmitting(false)
    }
  }

  const order = data?.order
  const events = data?.events || []

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguagePicker size="sm" />
      </div>
      <div style={{ width: '100%', maxWidth: 580 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, background: '#0080ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>🛡</div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#0D3B66' }}>Safe Track</span>
          </div>
          <p style={{ fontSize: 14, color: '#64748b' }}>Suivez votre commande en temps réel</p>
          <button
            type="button"
            onClick={() => navigate('/customer')}
            style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#0080ff', fontSize: 13, cursor: 'pointer' }}
          >
            ← Mon espace client
          </button>
        </div>

        <Card padding="md" style={{ marginBottom: 16 }}>
          <form
            onSubmit={e => { e.preventDefault(); if (code.trim()) doTrack(code.trim()) }}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}
          >
            <Input
              label="Code de suivi"
              placeholder="SO-A1B2C3"
              value={code}
              onChange={e => setCode(e.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <Button type="submit" loading={loading}>Suivre</Button>
          </form>
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>}
        </Card>

        {order && (
          <>
            <Card padding="md" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Commande</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0080ff' }}>{order.tracking_code}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{order.product_name}</div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 13, color: '#64748b' }}>
                  <span>Prix: <strong>{order.product_price.toLocaleString()} DA</strong></span>
                  {order.safe_pay_amount > 0 && (
                    <span>Acompte: <strong style={{ color: '#0D6E3F' }}>{order.safe_pay_amount.toLocaleString()} DA</strong></span>
                  )}
                </div>
              </div>
              {data.estimated_delivery && (
                <div style={{ marginTop: 12, padding: 10, background: '#f0f7ff', borderRadius: 8, textAlign: 'center', fontSize: 13, color: '#0080ff', fontWeight: 500 }}>
                  ⏰ Livraison estimée: {data.estimated_delivery}
                </div>
              )}
            </Card>

            <Card padding="md" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 16 }}>Historique</div>
              <div className="timeline">
                {events.map((evt: any, i: number) => (
                  <div key={evt.id} className="timeline__item">
                    <div className={`timeline__dot ${i === events.length - 1 ? 'timeline__dot--active' : ''} ${evt.status === 'delivered' ? 'timeline__dot--success' : ''} ${evt.status === 'return_processed' ? 'timeline__dot--danger' : ''}`} />
                    <div className="timeline__time">{new Date(evt.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="timeline__text"><StatusBadge status={evt.status} /></div>
                    {evt.note && <div className="timeline__note">{evt.note}</div>}
                  </div>
                ))}
              </div>
            </Card>

            {order.status === 'delivered' && (
              <Card padding="md" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>
                  ⭐ Votre avis
                </div>
                {fbDone || feedback ? (
                  <div style={{ padding: 12, background: '#e6f5ed', borderRadius: 8, color: '#0D6E3F', fontSize: 13 }}>
                    ✓ Merci ! Votre avis ({feedback?.rating ?? fbRating}/5) a été enregistré.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFbRating(n)}
                          style={{
                            flex: 1, padding: 10, fontSize: 18, borderRadius: 8,
                            border: `2px solid ${fbRating >= n ? '#F0AE1A' : '#e2e8f0'}`,
                            background: fbRating >= n ? '#fff8e6' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {fbRating >= n ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {FEEDBACK_CRITERIA.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => toggleCriteria(c.value)}
                          style={{
                            padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500,
                            border: `1.5px solid ${fbCriteria.includes(c.value) ? '#0080ff' : '#e2e8f0'}`,
                            background: fbCriteria.includes(c.value) ? '#e8f3ff' : '#fff',
                            color: fbCriteria.includes(c.value) ? '#0080ff' : '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="form-field__input"
                      rows={2}
                      placeholder="Commentaire (optionnel)"
                      value={fbComment}
                      onChange={e => setFbComment(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                    <Button onClick={submitFeedback} loading={fbSubmitting}>
                      Envoyer mon avis
                    </Button>
                  </div>
                )}
              </Card>
            )}

            <Card padding="md">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>💬 Remarque</div>
              {remarkSent ? (
                <div style={{ padding: 12, background: '#e6f5ed', borderRadius: 8, color: '#0D6E3F', fontSize: 13, textAlign: 'center' }}>✓ Remarque envoyée</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Input placeholder="Votre téléphone" value={remarkPhone} onChange={e => setRemarkPhone(e.target.value)} />
                  <Input placeholder="Ex: Disponible après 17h..." value={remark} onChange={e => setRemark(e.target.value)} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!remark || !remarkPhone) return
                      try {
                        await trackingApi.addRemark(order.tracking_code, remark, remarkPhone)
                        setRemarkSent(true)
                      } catch (err: any) {
                        setError(err.message || 'Erreur')
                      }
                    }}
                  >
                    Envoyer
                  </Button>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
