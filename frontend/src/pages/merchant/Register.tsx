/**
 * Safe Order — Merchant Registration Page (FR-02)
 */
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi, DeliveryCompany } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Select } from '../../components/ui'
import LanguagePicker from '../../components/LanguagePicker'

export default function MerchantRegister() {
  const navigate = useNavigate()
  const { loginWithTokens } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [wilayas, setWilayas] = useState<string[]>([])
  const [companies, setCompanies] = useState<DeliveryCompany[]>([])

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', password: '',
    store_name: '', wilaya: '', municipality: '', address: '',
    delivery_companies: [] as string[],
  })

  useEffect(() => {
    authApi.getWilayas().then(setWilayas).catch(() => {})
    authApi.getDeliveryCompanies().then(setCompanies).catch(() => {})
  }, [])

  const update = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const toggleCompany = (slug: string) => {
    setForm(f => ({
      ...f,
      delivery_companies: f.delivery_companies.includes(slug)
        ? f.delivery_companies.filter(s => s !== slug)
        : [...f.delivery_companies, slug],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ''))) {
      setError('Numéro de téléphone invalide (format attendu: 0XXXXXXXXX)')
      return
    }
    if (!form.wilaya) {
      setError('Veuillez sélectionner une wilaya')
      return
    }

    setLoading(true)
    try {
      const tokens = await authApi.registerMerchant({
        ...form,
        phone: form.phone.replace(/\s/g, ''),
      })
      await loginWithTokens(tokens)
      navigate('/merchant/safe-standards', { replace: true })
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguagePicker size="sm" />
      </div>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-card__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="auth-card__logo-icon">🛡</div>
          <span className="auth-card__logo-text">Safe Order</span>
        </div>

        <h2 className="auth-card__title">Créer un compte marchand</h2>
        <p className="auth-card__subtitle">
          Inscrivez votre boutique pour commencer à sécuriser vos livraisons.
        </p>

        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="auth-card__row">
            <Input label="Prénom" value={form.first_name} onChange={e => update('first_name', e.target.value)} required placeholder="Yassine" />
            <Input label="Nom" value={form.last_name} onChange={e => update('last_name', e.target.value)} required placeholder="Boudjema" />
          </div>

          <Input label="Nom de la boutique" value={form.store_name} onChange={e => update('store_name', e.target.value)} required placeholder="TechStore DZ" />

          <div className="auth-card__row">
            <Input label="Téléphone" value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="0551234567" />
            <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} required placeholder="email@exemple.com" />
          </div>

          <Input label="Mot de passe" type="password" value={form.password} onChange={e => update('password', e.target.value)} required placeholder="Min. 8 caractères" />

          <div className="auth-card__row">
            <Select
              label="Wilaya"
              value={form.wilaya}
              onChange={e => update('wilaya', e.target.value)}
              options={wilayas.map(w => ({ value: w, label: w }))}
            />
            <Input label="Commune" value={form.municipality} onChange={e => update('municipality', e.target.value)} placeholder="Hydra" />
          </div>

          <Input label="Adresse" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Rue, quartier..." />

          <div className="form-field">
            <label className="form-field__label">Sociétés de livraison</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {companies.map(c => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => toggleCompany(c.slug)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 500,
                    border: `1.5px solid ${form.delivery_companies.includes(c.slug) ? '#0080ff' : '#e2e8f0'}`,
                    background: form.delivery_companies.includes(c.slug) ? '#e8f3ff' : '#fff',
                    color: form.delivery_companies.includes(c.slug) ? '#0080ff' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Créer mon compte
          </Button>
        </form>

        <div className="auth-card__footer">
          Déjà un compte ? <Link to="/merchant/login">Se connecter</Link>
        </div>
      </div>
    </div>
  )
}
