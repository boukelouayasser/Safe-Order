/**
 * Safe Order — Customer Order Page (FR-07, FR-08).
 *
 * Reached via a unique link (`/order/<token>`) generated when the merchant creates
 * an order. The page is intentionally usable without an account, but if the customer
 * is signed in we pre-fill name + phone + last-known address from their profile.
 *
 * The wilaya (58) and the delivery-company list are loaded from the backend so the
 * customer can never enter an unknown wilaya — the merchant's dashboard slices by
 * wilaya in Statistics (F12), so freeform input would corrupt the analytics.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ordersApi, OrderResponse } from '../../api/orders'
import { paymentsApi } from '../../api/endpoints'
import { authApi, DeliveryCompany } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import LanguagePicker from '../../components/LanguagePicker'
import { Button, Input, Select, Spinner } from '../../components/ui'

export default function CustomerOrder() {
  const { token } = useParams<{ token: string }>()
  const { user, isAuthenticated } = useAuth()
  const t = useT()

  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'view' | 'fill' | 'pay' | 'done'>('view')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reference data (loaded once)
  const [wilayas, setWilayas] = useState<string[]>([])
  const [companies, setCompanies] = useState<DeliveryCompany[]>([])

  // Fill form
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    delivery_company: '', delivery_mode: 'home' as 'home' | 'pickup',
    wilaya: '', municipality: '', address: '', remark: '',
  })

  // Payment form
  const [payForm, setPayForm] = useState({
    method: 'cib' as 'cib' | 'dahabia' | 'baridimob',
    card_number: '', card_holder: '', expiry: '', cvv: '',
  })

  // ── Load order + reference data ──────────────────────────────────────────
  useEffect(() => {
    if (!token) { setLoading(false); return }
    Promise.all([
      ordersApi.getByLink(token).catch(() => null),
      authApi.getWilayas().catch(() => []),
      authApi.getDeliveryCompanies().catch(() => []),
    ]).then(([o, w, c]) => {
      setWilayas(w as string[])
      setCompanies(c as DeliveryCompany[])
      if (o) {
        setOrder(o as OrderResponse)
        const ord = o as OrderResponse
        // If the customer has already filled this order, jump past the form.
        // The deposit is considered paid when the backend has stamped the
        // SAFE_PAY badge — at that point we go straight to "done" instead of
        // re-prompting for the card details.
        if (ord.customer_first_name) {
          const alreadyPaid = ord.badge === 'safe_pay' || ord.safe_pay_amount === 0
          setStep(alreadyPaid ? 'done' : 'pay')
          // Pre-fill payment-step state from existing data in case they come back.
          setForm(f => ({
            ...f,
            first_name: ord.customer_first_name || '',
            last_name: ord.customer_last_name || '',
            phone: ord.customer_phone || '',
            wilaya: ord.customer_wilaya || '',
            municipality: ord.customer_municipality || '',
            address: ord.customer_address || '',
            delivery_company: ord.delivery_company || '',
            delivery_mode: (ord.delivery_mode as 'home' | 'pickup') || 'home',
            remark: ord.customer_remark || '',
          }))
        }
      }
    }).finally(() => setLoading(false))
  }, [token])

  // ── If the visitor is signed in, prefill the form from their profile ────
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'customer') return
    if (order?.customer_first_name) return // already filled
    setForm(f => ({
      ...f,
      first_name: f.first_name || user.first_name,
      last_name: f.last_name || user.last_name,
      phone: f.phone || user.phone,
      wilaya: f.wilaya || user.wilaya || '',
      municipality: f.municipality || user.municipality || '',
      address: f.address || user.address || '',
    }))
  }, [isAuthenticated, user, order])

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleFill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    // Client-side validation — backend will re-check.
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ''))) {
      setError(t('order.invalid_link.title') === 'Invalid link' ? 'Invalid phone number (format 0XXXXXXXXX)' : 'Numéro de téléphone invalide (format 0XXXXXXXXX)')
      return
    }
    if (!form.wilaya) {
      setError('Wilaya: ' + t('common.required'))
      return
    }
    if (!form.delivery_company) {
      setError(t('field.delivery_company') + ': ' + t('common.required'))
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const updated = await ordersApi.fillOrder(token, {
        ...form,
        phone: form.phone.replace(/\s/g, ''),
      })
      setOrder(updated)
      setStep(updated.safe_pay_amount > 0 ? 'pay' : 'done')
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    setSubmitting(true)
    setError('')
    try {
      await paymentsApi.process({
        order_id: order.id,
        method: payForm.method,
        card_number: payForm.card_number || undefined,
        card_holder: payForm.card_holder || undefined,
        expiry: payForm.expiry || undefined,
        cvv: payForm.cvv || undefined,
      })
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Paiement refusé')
    } finally {
      setSubmitting(false)
    }
  }

  const wilayaOptions = useMemo(() => wilayas.map(w => ({ value: w, label: w })), [wilayas])
  const companyOptions = useMemo(
    () => companies.map(c => ({ value: c.slug, label: c.name + (c.has_api ? '  (API)' : '') })),
    [companies],
  )

  if (loading) return <div className="auth-page"><Spinner /></div>

  if (!order) {
    return (
      <div className="auth-page">
        <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}><LanguagePicker size="sm" /></div>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>❌</span>
          <h2 style={{ marginTop: 16, fontSize: 18 }}>{t('order.invalid_link.title')}</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 8, fontSize: 14 }}>
            {t('order.invalid_link.desc')}
          </p>
          <Button
            variant="outline"
            fullWidth
            style={{ marginTop: 16 }}
            onClick={() => { window.location.href = '/order' }}
          >
            {t('order.paste.cta')}
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: DONE ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="auth-page">
        <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}><LanguagePicker size="sm" /></div>
        <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <span style={{ fontSize: 56 }}>✅</span>
          <h2 style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>{t('order.done.title')}</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
            {t('order.done.subtitle')}
          </p>
          <div style={{ marginTop: 20, padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              {t('order.done.tracking')}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 1 }}>
              {order.tracking_code}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, textAlign: 'center' }}>
            <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('order.done.total')}</div>
              <div style={{ fontWeight: 600 }}>{(order.product_price + order.delivery_fee).toLocaleString()} DA</div>
            </div>
            <div style={{ padding: 12, background: 'var(--color-green-light)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--color-green)' }}>SAFE PAY</div>
              <div style={{ fontWeight: 600, color: 'var(--color-green)' }}>{order.safe_pay_amount.toLocaleString()} DA</div>
            </div>
          </div>
          <Button variant="outline" fullWidth style={{ marginTop: 20 }} onClick={() => window.location.href = `/track/${order.tracking_code}`}>
            {t('order.done.track_cta')}
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: PAY ───────────────────────────────────────────────────────────
  if (step === 'pay') {
    return (
      <div className="auth-page">
        <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}><LanguagePicker size="sm" /></div>
        <div className="auth-card" style={{ maxWidth: 460 }}>
          <div className="auth-card__logo">
            <div className="auth-card__logo-icon">🛡</div>
            <span className="auth-card__logo-text">Safe Pay</span>
          </div>
          <h2 className="auth-card__title">{t('pay.title')}</h2>
          <p
            className="auth-card__subtitle"
            dangerouslySetInnerHTML={{
              __html: t('pay.subtitle').replace('{amount}', `<strong>${order.safe_pay_amount.toLocaleString()}</strong>`),
            }}
          />

          <div style={{ padding: 14, background: 'var(--color-bg-secondary)', borderRadius: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{order.product_name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {t('order.product.price')}: {order.product_price.toLocaleString()} DA · {t('status.delivery')}: {order.delivery_fee.toLocaleString()} DA
            </div>
          </div>

          <form className="auth-card__form" onSubmit={handlePayment}>
            <div className="form-field">
              <label className="form-field__label">{t('pay.method')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['cib', 'dahabia', 'baridimob'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPayForm(f => ({ ...f, method }))}
                    style={{
                      flex: 1, padding: '12px 8px', borderRadius: 10,
                      border: `2px solid ${payForm.method === method ? '#0080ff' : '#e2e8f0'}`,
                      background: payForm.method === method ? '#e8f3ff' : '#fff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms ease',
                      color: payForm.method === method ? '#0080ff' : '#64748b',
                    }}
                  >
                    {method === 'cib' ? '💳 CIB' : method === 'dahabia' ? '🏦 Dahabia' : '📱 BaridiMob'}
                  </button>
                ))}
              </div>
            </div>

            {payForm.method !== 'baridimob' && (
              <>
                <Input label={t('pay.card_number')} value={payForm.card_number} onChange={e => setPayForm(f => ({ ...f, card_number: e.target.value }))} placeholder="4111 1111 1111 1111" />
                <Input label={t('pay.card_holder')} value={payForm.card_holder} onChange={e => setPayForm(f => ({ ...f, card_holder: e.target.value }))} placeholder="NOM PRENOM" />
                <div className="form-field">
                  <label className="form-field__label">{t('pay.expiry')}</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select
                      value={payForm.expiry.split('/')[0] || ''}
                      onChange={e => {
                        const yr = payForm.expiry.split('/')[1] || ''
                        setPayForm(f => ({ ...f, expiry: e.target.value + '/' + yr }))
                      }}
                      className="form-field__input"
                      style={{ flex: 1, appearance: 'auto' }}
                    >
                      <option value="">Mois</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = String(i + 1).padStart(2, '0')
                        return <option key={m} value={m}>{m}</option>
                      })}
                    </select>
                    <select
                      value={payForm.expiry.split('/')[1] || ''}
                      onChange={e => {
                        const mo = payForm.expiry.split('/')[0] || ''
                        setPayForm(f => ({ ...f, expiry: mo + '/' + e.target.value }))
                      }}
                      className="form-field__input"
                      style={{ flex: 1, appearance: 'auto' }}
                    >
                      <option value="">Année</option>
                      {Array.from({ length: 11 }, (_, i) => {
                        const y = String(new Date().getFullYear() + i).slice(-2)
                        return <option key={y} value={y}>{y}</option>
                      })}
                    </select>
                  </div>
                </div>
                <Input label={t('pay.cvv')} value={payForm.cvv} onChange={e => setPayForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="123" inputMode="numeric" maxLength={4} />
              </>
            )}

            {payForm.method === 'baridimob' && (
              <div style={{ padding: 16, background: 'var(--color-gold-light)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {t('pay.baridimob.instruction').replace('{amount}', order.safe_pay_amount.toLocaleString())}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-navy)', marginTop: 8 }}>
                  0799 000 000
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={submitting}>
              {t('pay.cta').replace('{amount}', order.safe_pay_amount.toLocaleString())}
            </Button>

            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {t('pay.secure')}
            </p>
          </form>
        </div>
      </div>
    )
  }

  // ── Step: VIEW / FILL ───────────────────────────────────────────────────
  return (
    <div className="auth-page" style={{ minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}><LanguagePicker size="sm" /></div>
      <div className="auth-card" style={{ maxWidth: 520, width: '100%', margin: '0 auto' }}>
        <div className="auth-card__logo">
          <div className="auth-card__logo-icon">🛡</div>
          <span className="auth-card__logo-text">Safe Order</span>
        </div>

        {/* Product Info */}
        <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 12, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{order.product_name}</h3>
          {order.product_description && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
              {order.product_description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('order.product.price')}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{order.product_price.toLocaleString()} DA</div>
            </div>
            {order.safe_pay_amount > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-green)' }}>{t('order.product.deposit')}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-green)' }}>{order.safe_pay_amount.toLocaleString()} DA</div>
              </div>
            )}
          </div>
        </div>

        {step === 'view' ? (
          <div>
            <h2 className="auth-card__title">{t('order.fill.title')}</h2>
            <p className="auth-card__subtitle">{t('order.fill.subtitle')}</p>
            <Button fullWidth onClick={() => setStep('fill')}>
              {t('order.fill.cta_view')}
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="auth-card__title">{t('order.delivery.title')}</h2>
            <p className="auth-card__subtitle">{t('order.delivery.subtitle')}</p>

            <form className="auth-card__form" onSubmit={handleFill}>
              <div className="auth-card__row">
                <Input label={t('field.first_name')} value={form.first_name} onChange={e => update('first_name', e.target.value)} required placeholder="Yassine" />
                <Input label={t('field.last_name')} value={form.last_name} onChange={e => update('last_name', e.target.value)} required placeholder="Boudjema" />
              </div>
              <Input label={t('field.phone')} value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="0551234567" inputMode="tel" />

              <Select
                label={t('field.delivery_company')}
                value={form.delivery_company}
                onChange={e => update('delivery_company', e.target.value)}
                options={companyOptions}
                required
              />

              <div className="form-field">
                <label className="form-field__label">{t('order.delivery.mode')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['home', 'pickup'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => update('delivery_mode', mode)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8,
                        border: `2px solid ${form.delivery_mode === mode ? '#0080ff' : '#e2e8f0'}`,
                        background: form.delivery_mode === mode ? '#e8f3ff' : '#fff',
                        fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        color: form.delivery_mode === mode ? '#0080ff' : '#64748b',
                      }}
                    >
                      {mode === 'home' ? t('order.delivery.home') : t('order.delivery.pickup')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="auth-card__row">
                <Select
                  label={t('field.wilaya')}
                  value={form.wilaya}
                  onChange={e => update('wilaya', e.target.value)}
                  options={wilayaOptions}
                  required
                />
                <Input
                  label={t('field.municipality')}
                  value={form.municipality}
                  onChange={e => update('municipality', e.target.value)}
                  required
                  placeholder="Hydra"
                />
              </div>
              <Input
                label={t('field.address')}
                value={form.address}
                onChange={e => update('address', e.target.value)}
                required
                placeholder={t('order.field.address_placeholder')}
              />
              <Input
                label={`${t('field.remark')} (${t('common.optional')})`}
                value={form.remark}
                onChange={e => update('remark', e.target.value)}
                placeholder={t('order.field.remark_placeholder')}
              />

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth loading={submitting}>
                {t('order.confirm')}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
