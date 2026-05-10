/**
 * Safe Order — Customer Login / Signup
 *
 * Two-step phone-based flow with OTP verification.
 *  Step 1: phone (and first/last name if the phone is unknown). Sends OTP.
 *  Step 2: OTP entry. Verifies + returns tokens.
 *
 * Demo mode accepts the OTP "123456" universally and surfaces the code in
 * the response so the jury never has to wait for an SMS that won't arrive.
 */
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { Button, Input } from '../../components/ui'
import { useT, useLanguage } from '../../i18n'
import LanguagePicker from '../../components/LanguagePicker'

type Mode = 'login' | 'signup' | null

export default function CustomerLogin() {
  const navigate = useNavigate()
  const { loginWithTokens, isAuthenticated, isLoading, user } = useAuth()
  const t = useT()
  const { locale } = useLanguage()

  // Redirect already-signed-in customers back to their hub.
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) return
    if (user.role === 'customer') navigate('/customer', { replace: true })
    else if (user.role === 'merchant') navigate('/merchant/dashboard', { replace: true })
    else if (user.role === 'admin') navigate('/admin', { replace: true })
  }, [isAuthenticated, user, isLoading, navigate])

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [mode, setMode] = useState<Mode>(null)

  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cleanPhone = (p: string) => p.replace(/\s/g, '')
  const phoneIsValid = (p: string) => /^0\d{9}$/.test(cleanPhone(p))

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phoneIsValid(phone)) {
      setError('Numéro de téléphone invalide (format attendu : 0XXXXXXXXX)')
      return
    }

    setLoading(true)
    try {
      const phoneClean = cleanPhone(phone)

      // 1) Discover whether the account exists already.
      const existsRes = await authApi.customerExists(phoneClean)
      if (existsRes.exists) {
        setMode('login')
        if (existsRes.first_name) setFirstName(existsRes.first_name)
      } else {
        setMode('signup')
        if (!firstName.trim() || !lastName.trim()) {
          setError("Prénom et nom requis pour créer un compte")
          setLoading(false)
          return
        }
      }

      // 2) Trigger the OTP. In demo mode the response carries `demo_code`.
      const purpose = existsRes.exists ? 'login' : 'registration'
      const otp = await authApi.sendOtp(phoneClean, purpose)
      setDemoCode(otp.demo_code ?? null)
      setStep('otp')
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du code")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!/^\d{6}$/.test(code)) {
      setError('Code à 6 chiffres requis')
      return
    }

    setLoading(true)
    try {
      const phoneClean = cleanPhone(phone)
      const purpose = mode === 'signup' ? 'registration' : 'login'
      const tokens = await authApi.verifyOtp(phoneClean, code, purpose, {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        language: locale,
      })
      const u = await loginWithTokens(tokens)
      // Persist for the existing CustomerHome fallback flow.
      localStorage.setItem('customer_phone', u.phone)
      navigate('/customer', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Code OTP invalide')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    setStep('phone')
    setCode('')
    setError('')
    setDemoCode(null)
  }

  return (
    <div className="auth-page" style={{ minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguagePicker size="sm" />
      </div>
      <div className="auth-card" style={{ maxWidth: 420, width: '100%', margin: '0 auto' }}>
        <div className="auth-card__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="auth-card__logo-icon">🛡</div>
          <span className="auth-card__logo-text">Safe Order</span>
        </div>

        <h2 className="auth-card__title">
          {step === 'phone'
            ? t('customer.login.hub_title')
            : mode === 'signup' ? t('customer.login.signup_title') : t('customer.login.login_title')}
        </h2>
        <p className="auth-card__subtitle">
          {step === 'phone' ? t('customer.login.hub_subtitle') : t('customer.login.otp_subtitle')}
        </p>

        {step === 'phone' ? (
          <form className="auth-card__form" onSubmit={handlePhoneSubmit}>
            <Input
              label={t('field.phone')}
              placeholder="0552222222"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              inputMode="tel"
              autoFocus
            />

            <Input
              label={t('field.first_name')}
              placeholder="Amina"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              hint={t('customer.login.first_name_hint')}
            />
            <Input
              label={t('field.last_name')}
              placeholder="Khelifi"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />

            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading}>
              {t('customer.login.send_code')}
            </Button>

            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
              {t('common.demo_otp')}
            </p>
          </form>
        ) : (
          <form className="auth-card__form" onSubmit={handleOtpSubmit}>
            <Input
              label="OTP"
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />

            {demoCode && (
              <div style={{ padding: 10, background: '#fff8e6', borderRadius: 8, fontSize: 12, color: '#7a5b00', textAlign: 'center' }}>
                🧪 Mode démo — code : <strong>{demoCode}</strong>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading}>
              {mode === 'signup' ? t('customer.login.signup') : t('customer.login.signin')}
            </Button>

            <button
              type="button"
              onClick={goBack}
              style={{ background: 'transparent', border: 'none', color: '#0080ff', fontSize: 13, cursor: 'pointer' }}
            >
              {t('customer.login.change_phone')}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <Link to="/">{t('common.home')}</Link>
        </div>
      </div>
    </div>
  )
}
