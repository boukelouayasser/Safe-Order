/**
 * Safe Order — Merchant Login Page
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api/auth'
import { Button, Input } from '../../components/ui'
import { useT } from '../../i18n'
import LanguagePicker from '../../components/LanguagePicker'

export default function MerchantLogin() {
  const navigate = useNavigate()
  const { login, quickLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const routeFor = async (role: string) => {
    if (role === 'admin') return '/admin'
    if (role === 'customer') return '/customer'
    // merchant — check Safe Standards status
    try {
      const status = await authApi.getSafeStandardsStatus()
      return status.accepted ? '/merchant/dashboard' : '/merchant/safe-standards'
    } catch {
      return '/merchant/dashboard'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      const target = await routeFor(u.role)
      navigate(target, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (role: string) => {
    setError('')
    setLoading(true)
    try {
      const u = await quickLogin(role)
      const target = await routeFor(u.role)
      navigate(target, { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fillTestAccount = () => {
    setEmail('test@safeorder.dz')
    setPassword('Test1234!')
  }

  const t = useT()

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguagePicker size="sm" />
      </div>
      <div className="auth-card">
        <div className="auth-card__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="auth-card__logo-icon">🛡</div>
          <span className="auth-card__logo-text">Safe Order</span>
        </div>

        <h2 className="auth-card__title">{t('merchant.login.title')}</h2>
        <p className="auth-card__subtitle">{t('merchant.login.subtitle')}</p>

        <form className="auth-card__form" onSubmit={handleSubmit}>
          <Input
            label={t('field.email')}
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            label={t('field.password')}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            {t('merchant.login.submit')}
          </Button>
        </form>

        <div className="auth-card__footer">
          {t('merchant.login.no_account')} <Link to="/merchant/register">{t('merchant.login.create_account')}</Link>
        </div>

        <div className="auth-card__divider">Demo</div>

        <div className="auth-card__demo">
          <div className="auth-card__demo-title">{t('merchant.login.demo_title')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="auth-card__demo-btn" onClick={fillTestAccount} disabled={loading} type="button">
              {t('merchant.login.prefill_test')}
            </button>
            <button className="auth-card__demo-btn" onClick={() => handleDemoLogin('test')} disabled={loading} type="button">
              {t('merchant.login.quick_test')}
            </button>
            <button className="auth-card__demo-btn" onClick={() => handleDemoLogin('merchant')} disabled={loading} type="button">
              🏪 Marchand — TechStore DZ
            </button>
            <button className="auth-card__demo-btn" onClick={() => handleDemoLogin('merchant2')} disabled={loading} type="button">
              👔 Marchand — Fashion Oran
            </button>
            <button className="auth-card__demo-btn" onClick={() => handleDemoLogin('admin')} disabled={loading} type="button">
              ⚙️ Admin — SafeOrder
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, textAlign: 'center' }}>
            Compte de test : <strong>test@safeorder.dz</strong> · <strong>Test1234!</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
