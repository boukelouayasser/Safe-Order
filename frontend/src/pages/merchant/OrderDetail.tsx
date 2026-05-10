/**
 * Safe Order — Order Detail Page
 * Full order info, tracking timeline, status transitions, and badges.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordersApi, OrderResponse, TrackingEvent } from '../../api/orders'
import { feedbackApi } from '../../api/endpoints'
import { Card, StatusBadge, OrderBadge, Button, Input, Spinner } from '../../components/ui'

const NEXT_STATUS: Record<string, { label: string; status: string }> = {
  confirmation: { label: 'Passer en préparation', status: 'preparation' },
  preparation: { label: 'Expédier le colis', status: 'dispatch' },
  dispatch: { label: 'Marquer en livraison', status: 'delivery' },
  delivery: { label: 'Marquer comme livré', status: 'delivered' },
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState({
    product_name: '', product_description: '', product_price: 0,
    delivery_fee: 0, safe_pay_percentage: 20,
  })

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  const loadOrder = async () => {
    try {
      const [o, e] = await Promise.all([
        ordersApi.getById(id!),
        ordersApi.getTracking(id!),
      ])
      setOrder(o)
      setEvents(e)

      if (o.status === 'return_processed') {
        try {
          const a = await feedbackApi.analyzeReturn(id!)
          setAnalysis(a)
        } catch { /* no analysis yet */ }
      }
    } catch {
      navigate('/merchant/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const advanceStatus = async () => {
    if (!order) return
    const next = NEXT_STATUS[order.status]
    if (!next) return

    setUpdating(true)
    try {
      await ordersApi.updateStatus(order.id, next.status)
      await loadOrder()
    } catch { /* ignore */ }
    finally { setUpdating(false) }
  }

  const markReturned = async () => {
    if (!order) return
    setUpdating(true)
    try {
      await ordersApi.updateStatus(order.id, 'return_processed', 'Colis non récupéré par le client')
      await loadOrder()
    } catch { /* ignore */ }
    finally { setUpdating(false) }
  }

  const isEditable = order?.status === 'confirmation' || order?.status === 'preparation'

  const openEdit = () => {
    if (!order) return
    setEditForm({
      product_name: order.product_name,
      product_description: order.product_description || '',
      product_price: order.product_price,
      delivery_fee: order.delivery_fee,
      safe_pay_percentage: order.safe_pay_amount > 0 ? Math.round((order.safe_pay_amount / order.product_price) * 100) : 0,
    })
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!order) return
    setUpdating(true)
    try {
      await ordersApi.updateOrder(order.id, editForm)
      setEditing(false)
      await loadOrder()
    } catch (err: any) {
      alert(err.message || 'Erreur')
    } finally { setUpdating(false) }
  }

  const handleDelete = async () => {
    if (!order) return
    if (!confirm(`Supprimer la commande ${order.tracking_code} ? Cette action est irréversible.`)) return
    setDeleting(true)
    try {
      await ordersApi.deleteOrder(order.id)
      navigate('/merchant/orders')
    } catch (err: any) {
      alert(err.message || 'Erreur')
      setDeleting(false)
    }
  }

  if (loading || !order) return <Spinner />

  const nextAction = NEXT_STATUS[order.status]
  const customerLink = `${window.location.origin}/order/${order.order_link_token}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} className="btn btn--ghost btn--sm">← Retour</button>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{order.tracking_code}</h2>
        <StatusBadge status={order.status} />
        <OrderBadge badge={order.badge} />
      </div>

      <div className="order-detail">
        {/* Left Column */}
        <div>
          {/* Product Info */}
          <Card className="order-detail__section">
            <div className="order-detail__section-title">Produit</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{order.product_name}</h3>
            {order.product_description && (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {order.product_description}
              </p>
            )}
            <div className="order-detail__info-grid" style={{ marginTop: 16 }}>
              <div className="order-detail__info-item">
                <span className="order-detail__info-label">Prix</span>
                <span className="order-detail__info-value">{order.product_price.toLocaleString()} DA</span>
              </div>
              <div className="order-detail__info-item">
                <span className="order-detail__info-label">Frais livraison</span>
                <span className="order-detail__info-value">{order.delivery_fee.toLocaleString()} DA</span>
              </div>
              <div className="order-detail__info-item">
                <span className="order-detail__info-label">Safe Pay (acompte)</span>
                <span className="order-detail__info-value" style={{ color: 'var(--color-green)', fontWeight: 600 }}>
                  {order.safe_pay_amount.toLocaleString()} DA
                </span>
              </div>
              <div className="order-detail__info-item">
                <span className="order-detail__info-label">Restant à payer</span>
                <span className="order-detail__info-value">{order.remaining_amount.toLocaleString()} DA</span>
              </div>
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="order-detail__section">
            <div className="order-detail__section-title">Client</div>
            {order.customer_first_name ? (
              <div className="order-detail__info-grid">
                <div className="order-detail__info-item">
                  <span className="order-detail__info-label">Nom</span>
                  <span className="order-detail__info-value">{order.customer_first_name} {order.customer_last_name}</span>
                </div>
                <div className="order-detail__info-item">
                  <span className="order-detail__info-label">Téléphone</span>
                  <span className="order-detail__info-value">{order.customer_phone}</span>
                </div>
                <div className="order-detail__info-item">
                  <span className="order-detail__info-label">Wilaya</span>
                  <span className="order-detail__info-value">{order.customer_wilaya}</span>
                </div>
                <div className="order-detail__info-item">
                  <span className="order-detail__info-label">Commune</span>
                  <span className="order-detail__info-value">{order.customer_municipality}</span>
                </div>
                <div className="order-detail__info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="order-detail__info-label">Adresse</span>
                  <span className="order-detail__info-value">{order.customer_address}</span>
                </div>
                {order.customer_remark && (
                  <div className="order-detail__info-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="order-detail__info-label">Remarque</span>
                    <span className="order-detail__info-value" style={{ color: 'var(--color-warning)' }}>
                      💬 {order.customer_remark}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                  Le client n'a pas encore rempli ses informations.
                </p>
                <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Lien client
                  </div>
                  <div style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--color-primary)' }}>
                    {customerLink}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    style={{ marginTop: 8 }}
                    onClick={() => navigator.clipboard.writeText(customerLink)}
                  >
                    Copier le lien
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Return Analysis */}
          {analysis && (
            <Card className="order-detail__section">
              <div className="order-detail__section-title">🧠 Analyse Safe Insights</div>
              <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>CAUSE IDENTIFIÉE</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{analysis.cause_label_fr}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Confiance: {(analysis.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                <strong>Recommandation :</strong> {analysis.recommendation_fr}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column — Timeline & Actions */}
        <div>
          {/* Actions */}
          <Card className="order-detail__section">
            <div className="order-detail__section-title">Actions</div>

            {/* Accept / Refuse — shown when customer has filled info and order is still in confirmation */}
            {order.status === 'confirmation' && order.customer_first_name && (
              <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                  📋 Commande remplie par le client
                </div>
                <div style={{ fontSize: 12, color: '#15803d', marginBottom: 14 }}>
                  {order.customer_first_name} {order.customer_last_name} — {order.customer_phone}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    fullWidth
                    loading={updating}
                    onClick={advanceStatus}
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  >
                    ✅ Accepter
                  </Button>
                  <Button
                    fullWidth
                    variant="danger"
                    loading={deleting}
                    onClick={handleDelete}
                  >
                    ❌ Refuser
                  </Button>
                </div>
              </div>
            )}

            {/* Generic next-step button — shown for all other stages (not confirmation-with-customer) */}
            {nextAction && !(order.status === 'confirmation' && order.customer_first_name) && (
              <Button fullWidth loading={updating} onClick={advanceStatus} style={{ marginBottom: 8 }}>
                {nextAction.label}
              </Button>
            )}

            {order.customer_first_name && (
              <Button
                fullWidth
                variant="outline"
                style={{ marginBottom: 8 }}
                onClick={() => ordersApi.openLabel(order.id).catch((err: any) => alert(err.message))}
              >
                🖨️ Imprimer l'étiquette PDF
              </Button>
            )}
            {isEditable && (
              <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                  🔗 Lien client
                </div>
                <div style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--color-primary)', marginBottom: 8 }}>
                  {customerLink}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => { navigator.clipboard.writeText(customerLink); alert('Lien copié !') }}
                >
                  📋 Copier le lien
                </Button>
              </div>
            )}
            {isEditable && (
              <Button fullWidth variant="secondary" onClick={openEdit} style={{ marginBottom: 8 }}>
                ✏️ Modifier la commande
              </Button>
            )}
            {order.status === 'delivery' && (
              <Button fullWidth variant="danger" loading={updating} onClick={markReturned} style={{ marginBottom: 8 }}>
                Marquer comme retour
              </Button>
            )}
            {isEditable && !(order.status === 'confirmation' && order.customer_first_name) && (
              <Button fullWidth variant="danger" loading={deleting} onClick={handleDelete} style={{ marginBottom: 8 }}>
                🗑️ Supprimer la commande
              </Button>
            )}
            {order.risk_score > 0 && (
              <div style={{ padding: 10, background: order.risk_score >= 60 ? '#fef2f2' : '#fef3cd', borderRadius: 8, fontSize: 12, marginTop: 8 }}>
                <strong>Risk Flag:</strong> {order.risk_score.toFixed(0)}/100
                {order.risk_score >= 60 && <span style={{ color: '#dc2626' }}> — Risque élevé</span>}
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card>
            <div className="order-detail__section-title">Suivi</div>
            <div className="timeline">
              {events.map((evt, i) => {
                const isLast = i === events.length - 1
                const isDone = evt.status === 'delivered'
                const isReturn = evt.status === 'return_processed'
                return (
                  <div key={evt.id} className="timeline__item">
                    <div className={`timeline__dot ${isLast ? 'timeline__dot--active' : ''} ${isDone ? 'timeline__dot--success' : ''} ${isReturn ? 'timeline__dot--danger' : ''}`} />
                    <div className="timeline__time">
                      {new Date(evt.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="timeline__text">
                      <StatusBadge status={evt.status} />
                    </div>
                    {evt.note && <div className="timeline__note">{evt.note}</div>}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
      {/* Edit Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Modifier la commande</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Nom du produit" value={editForm.product_name} onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))} />
              <Input label="Description" value={editForm.product_description} onChange={e => setEditForm(f => ({ ...f, product_description: e.target.value }))} />
              <Input label="Prix (DA)" type="number" value={editForm.product_price} onChange={e => setEditForm(f => ({ ...f, product_price: +e.target.value }))} />
              <Input label="Frais de livraison (DA)" type="number" value={editForm.delivery_fee} onChange={e => setEditForm(f => ({ ...f, delivery_fee: +e.target.value }))} />
              <Input label="Safe Pay (%)" type="number" value={editForm.safe_pay_percentage} onChange={e => setEditForm(f => ({ ...f, safe_pay_percentage: +e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button variant="outline" fullWidth onClick={() => setEditing(false)}>Annuler</Button>
              <Button fullWidth loading={updating} onClick={handleSaveEdit}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
