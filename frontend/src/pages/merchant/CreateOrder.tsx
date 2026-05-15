/**
 * Safe Order — Create Order Page
 * Merchant creates a new order and gets a link for the customer.
 */
import { useState } from 'react'
import { ordersApi } from '../../api/orders'
import { useT } from '../../i18n'
import { Button, Input, Card } from '../../components/ui'

export default function CreateOrder() {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ link: string; code: string; orderId: string } | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    product_name: '',
    product_description: '',
    product_price: '',
    delivery_fee: '500',
    safe_pay_percentage: '20',
  })

  const update = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.product_name.trim()) return setError('Product name required')
    if (!form.product_price || parseFloat(form.product_price) <= 0) return setError('Invalid price')

    setLoading(true)
    try {
      const data = await ordersApi.create({
        product_name: form.product_name.trim(),
        product_description: form.product_description || undefined,
        product_price: parseFloat(form.product_price),
        delivery_fee: parseFloat(form.delivery_fee) || 0,
        safe_pay_percentage: parseFloat(form.safe_pay_percentage) || 20,
      })
      setResult({ link: data.customer_link, code: data.order.tracking_code, orderId: data.order.id })
    } catch (err: any) {
      setError(err.message || "Error creating order")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (insecure context) — fall back to a textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = result.link
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareWhatsapp = () => {
    if (!result) return
    const safePay = (parseFloat(form.product_price) * parseFloat(form.safe_pay_percentage) / 100).toFixed(0)
    const lines = [
      `🛡 Safe Order — ${form.product_name}`,
      `Price: ${parseFloat(form.product_price).toLocaleString()} DA · Delivery: ${parseFloat(form.delivery_fee).toLocaleString()} DA`,
      `Safe Pay deposit: ${parseInt(safePay).toLocaleString()} DA`,
      ``,
      `Confirm your order:`,
      result.link,
      ``,
      `Tracking code: ${result.code}`,
    ]
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  if (result) {
    const safePay = (parseFloat(form.product_price) * parseFloat(form.safe_pay_percentage) / 100).toFixed(0)
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card padding="lg">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>✅</span>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>{t('create.success')}</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {t('create.code')} : <strong style={{ color: 'var(--color-primary)' }}>{result.code}</strong>
            </p>
          </div>

          <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
              {t('create.share.title')}
            </div>
            <input
              readOnly
              value={result.link}
              onClick={e => (e.target as HTMLInputElement).select()}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                fontSize: 12, fontFamily: 'monospace', color: '#0080ff', marginBottom: 10, background: '#fff',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" size="sm" onClick={handleCopy} style={{ flex: 1 }}>
                {copied ? t('create.share.copied') : t('create.share.copy')}
              </Button>
              <Button variant="outline" size="sm" onClick={shareWhatsapp} style={{ flex: 1 }}>
                {t('create.share.whatsapp')}
              </Button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('order.product.price')}</div>
              <div style={{ fontWeight: 600 }}>{parseFloat(form.product_price).toLocaleString()} DA</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>SAFE PAY</div>
              <div style={{ fontWeight: 600, color: 'var(--color-green)' }}>{parseInt(safePay).toLocaleString()} DA</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('status.delivery')}</div>
              <div style={{ fontWeight: 600 }}>{parseFloat(form.delivery_fee).toLocaleString()} DA</div>
            </div>
          </div>

          <Button
            variant="outline"
            fullWidth
            style={{ marginTop: 20 }}
            onClick={() => { setResult(null); setForm({ product_name: '', product_description: '', product_price: '', delivery_fee: '500', safe_pay_percentage: '20' }) }}
          >
            {t('create.another')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <Card padding="lg">
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t('nav.create_order')}</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
          Create a product listing. A unique link will be generated for your customer.
        </p>

        <form className="auth-card__form" onSubmit={handleSubmit}>
          <Input
            label="Product name"
            value={form.product_name}
            onChange={e => update('product_name', e.target.value)}
            required
            placeholder="Bluetooth Wireless Earbuds Pro"
          />
          <div className="form-field">
            <label className="form-field__label">Description</label>
            <textarea
              className="form-field__input"
              value={form.product_description}
              onChange={e => update('product_description', e.target.value)}
              placeholder="Describe the product in detail..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="auth-card__row">
            <Input
              label="Price (DA)"
              type="number"
              value={form.product_price}
              onChange={e => update('product_price', e.target.value)}
              required
              placeholder="4500"
              min="0"
            />
            <Input
              label="Delivery fee (DA)"
              type="number"
              value={form.delivery_fee}
              onChange={e => update('delivery_fee', e.target.value)}
              placeholder="500"
              min="0"
            />
          </div>
          <Input
            label="Safe Pay — % of price as deposit"
            type="number"
            value={form.safe_pay_percentage}
            onChange={e => update('safe_pay_percentage', e.target.value)}
            placeholder="20"
            min="0"
            max="100"
            hint={form.product_price ? `Deposit: ${(parseFloat(form.product_price) * parseFloat(form.safe_pay_percentage || '0') / 100).toFixed(0)} DA` : ''}
          />

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Create order
          </Button>
        </form>
      </Card>
    </div>
  )
}
