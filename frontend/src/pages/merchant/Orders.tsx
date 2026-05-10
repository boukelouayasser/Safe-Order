/**
 * Safe Order — Orders Pipeline Page
 * Full pipeline view with 6 categories — same as dashboard but dedicated page.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersApi, PipelineCounts, OrderSummary } from '../../api/orders'
import { Card, OrderBadge, StatusBadge, Spinner, EmptyState, Button } from '../../components/ui'

const PIPELINE_STAGES = [
  { key: 'confirmation', label: 'Confirmation', color: '#0080ff' },
  { key: 'preparation', label: 'Préparation', color: '#f59e0b' },
  { key: 'dispatch', label: 'Expédition', color: '#8b5cf6' },
  { key: 'delivery', label: 'Livraison', color: '#06b6d4' },
  { key: 'delivered', label: 'Livré', color: '#10b981' },
  { key: 'return_processed', label: 'Retour', color: '#ef4444' },
]

export default function Orders() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState<PipelineCounts | null>(null)
  const [activeStage, setActiveStage] = useState('confirmation')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ordersApi.getPipelineCounts().then(setCounts).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    ordersApi.getByStatus(activeStage).then(setOrders).catch(() => setOrders([]))
  }, [activeStage])

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {counts?.total || 0} commande{(counts?.total || 0) > 1 ? 's' : ''} au total
          </span>
        </div>
        <Button size="sm" onClick={() => navigate('/merchant/create-order')}>
          + Nouvelle commande
        </Button>
      </div>

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
              <div className="pipeline__count" style={{ color: stage.color }}>{count}</div>
              <div className="pipeline__label">{stage.label}</div>
            </div>
          )
        })}
      </div>

      {/* Orders Table */}
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
                  <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/merchant/orders/${order.id}`)}>
                    <td><span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 13 }}>{order.tracking_code}</span></td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.product_name}</td>
                    <td>{order.customer_first_name ? `${order.customer_first_name} ${order.customer_last_name || ''}` : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: 13 }}>{order.customer_wilaya || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{order.product_price.toLocaleString()} DA</td>
                    <td style={{ fontWeight: 500, color: order.safe_pay_amount > 0 ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                      {order.safe_pay_amount > 0 ? `${order.safe_pay_amount.toLocaleString()} DA` : '—'}
                    </td>
                    <td><OrderBadge badge={order.badge} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
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
