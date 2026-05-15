/**
 * Safe Order — Customer Order Page (FR-07, FR-08).
 *
 * Reached via a unique link (`/order/<token>`). Usable without an account;
 * if the customer is signed in we pre-fill name + phone + address.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ordersApi, OrderResponse } from '../../api/orders'
import { paymentsApi } from '../../api/endpoints'
import { authApi, DeliveryCompany } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import CustomerHeader from '../../components/CustomerHeader'

export default function CustomerOrder() {
  const { token } = useParams<{ token: string }>()
  const { user, isAuthenticated } = useAuth()
  const t = useT()

  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'view' | 'fill' | 'pay' | 'done'>('view')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [wilayas, setWilayas] = useState<string[]>([])
  const [companies, setCompanies] = useState<DeliveryCompany[]>([])

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    delivery_company: '', delivery_mode: 'home' as 'home' | 'pickup',
    wilaya: '', municipality: '', address: '', remark: '',
  })

  const [payForm, setPayForm] = useState({
    method: 'cib' as 'cib' | 'dahabia' | 'baridimob',
    card_number: '', card_holder: '', expiry: '', cvv: '',
  })

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
        const ord = o as OrderResponse
        setOrder(ord)
        if (ord.customer_first_name) {
          const alreadyPaid = ord.badge === 'safe_pay' || ord.safe_pay_amount === 0
          setStep(alreadyPaid ? 'done' : 'pay')
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

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'customer') return
    if (order?.customer_first_name) return
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
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ''))) {
      setError('Invalid phone number (format 0XXXXXXXXX)')
      return
    }
    if (!form.wilaya) { setError('Province: ' + t('common.required')); return }
    if (!form.delivery_company) { setError(t('field.delivery_company') + ': ' + t('common.required')); return }

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
      setError(err.message || 'Error')
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
      setError(err.message || 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  const wilayaOptions = useMemo(() => wilayas.map(w => ({ value: w, label: w })), [wilayas])
  const companyOptions = useMemo(
    () => companies.map(c => ({ value: c.slug, label: c.name + (c.has_api ? '  (API)' : '') })),
    [companies],
  )

  /* ---------- loading ---------- */
  if (loading) {
    return <div className="cs-page"><div className="cs-loading"><div className="cs-spinner" /></div></div>
  }

  /* ---------- invalid link ---------- */
  if (!order) {
    return (
      <div className="cs-page">
        <CustomerHeader />
        <div className="cs-shell narrow centered">
          <div className="cs-card cs-card-pad">
            <div className="cs-empty">
              <div className="ic">⚠️</div>
              <h3>{t('order.invalid_link.title')}</h3>
              <p>{t('order.invalid_link.desc')}</p>
            </div>
            <button
              className="cs-btn cs-btn--outline cs-btn--block"
              onClick={() => { window.location.href = '/order' }}
            >
              {t('order.paste.cta')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- done ---------- */
  if (step === 'done') {
    return (
      <div className="cs-page">
        <CustomerHeader />
        <div className="cs-shell narrow centered">
          <div className="cs-card cs-card-pad">
            <div className="cs-hero">
              <div className="mark">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2>{t('order.done.title')}</h2>
              <p>{t('order.done.subtitle')}</p>
              <div className="cs-code-box">
                <div className="k">{t('order.done.tracking')}</div>
                <div className="v">{order.tracking_code}</div>
              </div>
            </div>
            <div className="cs-tiles" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
              <div className="cs-tile">
                <div className="v">{(order.product_price + order.delivery_fee).toLocaleString()} DA</div>
                <div className="l">{t('order.done.total')}</div>
              </div>
              <div className="cs-tile">
                <div className="v green">{order.safe_pay_amount.toLocaleString()} DA</div>
                <div className="l">Safe Pay</div>
              </div>
            </div>
            <button
              className="cs-btn cs-btn--primary cs-btn--block"
              style={{ marginTop: 16 }}
              onClick={() => { window.location.href = `/track/${order.tracking_code}` }}
            >
              {t('order.done.track_cta')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- pay ---------- */
  if (step === 'pay') {
    return (
      <div className="cs-page">
        <CustomerHeader />
        <div className="cs-shell narrow">
          <div className="cs-intro">
            <div className="cs-eyebrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Safe Pay
            </div>
            <h1 className="cs-h1">{t('pay.title')}</h1>
            <p
              className="cs-sub"
              dangerouslySetInnerHTML={{
                __html: t('pay.subtitle').replace('{amount}', `<strong>${order.safe_pay_amount.toLocaleString()}</strong>`),
              }}
            />
          </div>

          <div className="cs-card cs-card-pad">
            <div className="cs-product" style={{ marginBottom: 18 }}>
              <div className="pname">{order.product_name}</div>
              <div className="pdesc">
                {t('order.product.price')}: {order.product_price.toLocaleString()} DA · {t('status.delivery')}: {order.delivery_fee.toLocaleString()} DA
              </div>
            </div>

            <form className="cs-form" onSubmit={handlePayment}>
              <div className="cs-field" style={{ marginBottom: 0 }}>
                <label>{t('pay.method')}</label>
                <div className="cs-choices">
                  {(['cib', 'dahabia', 'baridimob'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      className={`cs-choice ${payForm.method === method ? 'active' : ''}`}
                      onClick={() => setPayForm(f => ({ ...f, method }))}
                    >
                      {method === 'cib' ? '💳 CIB' : method === 'dahabia' ? '🏦 Dahabia' : '📱 BaridiMob'}
                    </button>
                  ))}
                </div>
              </div>

              {payForm.method !== 'baridimob' && (
                <>
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>{t('pay.card_number')}</label>
                    <input className="cs-input" value={payForm.card_number} onChange={e => setPayForm(f => ({ ...f, card_number: e.target.value }))} placeholder="4111 1111 1111 1111" />
                  </div>
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>{t('pay.card_holder')}</label>
                    <input className="cs-input" value={payForm.card_holder} onChange={e => setPayForm(f => ({ ...f, card_holder: e.target.value }))} placeholder="FIRST NAME LAST NAME" />
                  </div>
                  <div className="cs-row">
                    <div className="cs-field" style={{ marginBottom: 0 }}>
                      <label>{t('pay.expiry')}</label>
                      <select
                        className="cs-select"
                        value={payForm.expiry.split('/')[0] || ''}
                        onChange={e => {
                          const yr = payForm.expiry.split('/')[1] || ''
                          setPayForm(f => ({ ...f, expiry: e.target.value + '/' + yr }))
                        }}
                      >
                        <option value="">Mois</option>
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = String(i + 1).padStart(2, '0')
                          return <option key={m} value={m}>{m}</option>
                        })}
                      </select>
                    </div>
                    <div className="cs-field" style={{ marginBottom: 0 }}>
                      <label>&nbsp;</label>
                      <select
                        className="cs-select"
                        value={payForm.expiry.split('/')[1] || ''}
                        onChange={e => {
                          const mo = payForm.expiry.split('/')[0] || ''
                          setPayForm(f => ({ ...f, expiry: mo + '/' + e.target.value }))
                        }}
                      >
                        <option value="">Year</option>
                        {Array.from({ length: 11 }, (_, i) => {
                          const y = String(new Date().getFullYear() + i).slice(-2)
                          return <option key={y} value={y}>{y}</option>
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>{t('pay.cvv')}</label>
                    <input className="cs-input" value={payForm.cvv} onChange={e => setPayForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="123" inputMode="numeric" maxLength={4} />
                  </div>
                </>
              )}

              {payForm.method === 'baridimob' && (
                <div className="cs-note">
                  {t('pay.baridimob.instruction').replace('{amount}', order.safe_pay_amount.toLocaleString())}
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>0799 000 000</div>
                </div>
              )}

              {error && <div className="cs-error">{error}</div>}

              <button type="submit" className="cs-btn cs-btn--primary cs-btn--block" disabled={submitting}>
                {submitting ? <span className="cs-btn-spinner" /> : t('pay.cta').replace('{amount}', order.safe_pay_amount.toLocaleString())}
              </button>
              <p style={{ fontSize: 11, color: 'var(--cs-ink-4)', textAlign: 'center', margin: 0 }}>
                {t('pay.secure')}
              </p>
            </form>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- view / fill ---------- */
  return (
    <div className="cs-page">
      <CustomerHeader />
      <div className="cs-shell mid">
        <div className="cs-card cs-card-pad">
          <div className="cs-product" style={{ marginBottom: 22 }}>
            <div className="pname">{order.product_name}</div>
            {order.product_description && <div className="pdesc">{order.product_description}</div>}
            <div className="cs-price-row">
              <div className="cs-price">
                <div className="k">{t('order.product.price')}</div>
                <div className="v">{order.product_price.toLocaleString()} DA</div>
              </div>
              {order.safe_pay_amount > 0 && (
                <div className="cs-price green">
                  <div className="k">{t('order.product.deposit')}</div>
                  <div className="v">{order.safe_pay_amount.toLocaleString()} DA</div>
                </div>
              )}
            </div>
          </div>

          {step === 'view' ? (
            <div>
              <h1 className="cs-h1" style={{ fontSize: 21 }}>{t('order.fill.title')}</h1>
              <p className="cs-sub" style={{ marginBottom: 18 }}>{t('order.fill.subtitle')}</p>
              <button className="cs-btn cs-btn--primary cs-btn--block" onClick={() => setStep('fill')}>
                {t('order.fill.cta_view')}
              </button>
            </div>
          ) : (
            <div>
              <h1 className="cs-h1" style={{ fontSize: 21 }}>{t('order.delivery.title')}</h1>
              <p className="cs-sub" style={{ marginBottom: 18 }}>{t('order.delivery.subtitle')}</p>

              <form className="cs-form" onSubmit={handleFill}>
                <div className="cs-row">
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>{t('field.first_name')}</label>
                    <input className="cs-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} required placeholder="Yassine" />
                  </div>
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>{t('field.last_name')}</label>
                    <input className="cs-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} required placeholder="Boudjema" />
                  </div>
                </div>

                <div className="cs-field" style={{ marginBottom: 0 }}>
                  <label>{t('field.phone')}</label>
                  <input className="cs-input" value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="0551234567" inputMode="tel" />
                </div>

                <div className="cs-field" style={{ marginBottom: 0 }}>
                  <label>{t('field.delivery_company')}</label>
                  <select className="cs-select" value={form.delivery_company} onChange={e => update('delivery_company', e.target.value)} required>
                    <option value="">{t('common.select_placeholder')}</option>
                    {companyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="cs-field" style={{ marginBottom: 0 }}>
                  <label>{t('order.delivery.mode')}</label>
                  <div className="cs-choices">
                    {(['home', 'pickup'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        className={`cs-choice ${form.delivery_mode === mode ? 'active' : ''}`}
                        onClick={() => update('delivery_mode', mode)}
                      >
                        {mode === 'home' ? t('order.delivery.home') : t('order.delivery.pickup')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cs-row">
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>{t('field.wilaya')}</label>
                    <select className="cs-select" value={form.wilaya} onChange={e => update('wilaya', e.target.value)} required>
                      <option value="">{t('common.select_placeholder')}</option>
                      {wilayaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="cs-field" style={{ marginBottom: 0 }}>
                    <label>{t('field.municipality')}</label>
                    <input className="cs-input" value={form.municipality} onChange={e => update('municipality', e.target.value)} required placeholder="Hydra" />
                  </div>
                </div>

                <div className="cs-field" style={{ marginBottom: 0 }}>
                  <label>{t('field.address')}</label>
                  <input className="cs-input" value={form.address} onChange={e => update('address', e.target.value)} required placeholder={t('order.field.address_placeholder')} />
                </div>

                <div className="cs-field" style={{ marginBottom: 0 }}>
                  <label>{t('field.remark')} ({t('common.optional')})</label>
                  <input className="cs-input" value={form.remark} onChange={e => update('remark', e.target.value)} placeholder={t('order.field.remark_placeholder')} />
                </div>

                {error && <div className="cs-error">{error}</div>}

                <button type="submit" className="cs-btn cs-btn--primary cs-btn--block" disabled={submitting}>
                  {submitting ? <span className="cs-btn-spinner" /> : t('order.confirm')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
