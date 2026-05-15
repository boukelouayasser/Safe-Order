/**
 * Safe Order — Login page
 *
 * Same 3-panel sliding shell as the registration page, but with sign-in forms.
 *  - Merchant side: email + password.
 *  - Customer side: phone → OTP, reusing the existing customerExists / sendOtp /
 *    verifyOtp flow.
 *
 * Routed from both /merchant/login and /customer/login — the URL determines
 * which tab is active by default.
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n'
import AuthShell, {
  AuthView, Field, Spinner,
} from '../auth/AuthShell'
import '../../styles/auth.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithTokens, login, quickLogin } = useAuth()
  const { locale } = useLanguage()

  // Prefer the panel explicitly carried over from the Register page (via Link
  // state) so switching Sign-in ↔ Sign-up never flips Merchant/Customer.
  // Fall back to the URL prefix for direct visits.
  const navView = (location.state as { authView?: AuthView } | null)?.authView
  const initialView: AuthView =
    navView === 'merchant' || navView === 'customer'
      ? navView
      : location.pathname.startsWith('/merchant') ? 'merchant' : 'customer'
  const [view, setView] = useState<AuthView>(initialView)

  const routeForRole = async (role: string) => {
    if (role === 'admin') return '/admin'
    if (role === 'customer') return '/customer'
    try {
      const status = await authApi.getSafeStandardsStatus()
      return status.accepted ? '/merchant/dashboard' : '/merchant/safe-standards'
    } catch {
      return '/merchant/dashboard'
    }
  }

  return (
    <AuthShell
      view={view}
      setView={setView}
      altLinkLabel="Create account →"
      altLinkTo={view === 'merchant' ? '/merchant/register' : '/customer/register'}
      merchantPanel={
        <MerchantLoginPanel
          onLogin={async (email, password) => {
            const u = await login(email, password)
            navigate(await routeForRole(u.role), { replace: true })
          }}
          onQuickLogin={async role => {
            const u = await quickLogin(role)
            navigate(await routeForRole(u.role), { replace: true })
          }}
        />
      }
      customerPanel={
        <CustomerLoginPanel
          locale={locale}
          onSuccess={async (tokens, phone) => {
            const u = await loginWithTokens(tokens)
            localStorage.setItem('customer_phone', u.phone || phone)
            navigate(await routeForRole(u.role), { replace: true })
          }}
          onDemoLogin={async () => {
            const u = await quickLogin('customer')
            localStorage.setItem('customer_phone', u.phone || '')
            navigate(await routeForRole(u.role), { replace: true })
          }}
        />
      }
    />
  )
}

/* ════════════════════════════════════════════
   MERCHANT LOGIN PANEL
   ════════════════════════════════════════════ */
function MerchantLoginPanel({
  onLogin,
  onQuickLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>
  onQuickLogin: (role: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(email, password)
    } catch (err: any) {
      setError(err.message || 'Wrong email or password')
    } finally {
      setLoading(false)
    }
  }

  const fillTestAccount = () => {
    setEmail('test@safeorder.dz')
    setPassword('Test1234!')
  }

  const quick = async (role: string) => {
    setError('')
    setLoading(true)
    try {
      await onQuickLogin(role)
    } catch (err: any) {
      setError(err.message || 'Demo login failed')
      setLoading(false)
    }
  }

  return (
    <section className="reg-panel form-panel" aria-label="Merchant sign in" data-form="merchant">
      <div className="reg-form-inner">
        <h1 className="reg-form-title">Sign in to your business</h1>

        <form className="reg-form" onSubmit={submit} noValidate>
          <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" placeholder="you@business.com" />
          <Field label="Password" pwdToggle value={password} onChange={setPassword} required autoComplete="current-password" />

          {error && <div className="reg-error">{error}</div>}

          <button className="reg-btn-primary" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Sign in'}
          </button>
        </form>

        <div className="reg-demo">
          <div className="reg-demo-title">
            <span>Demo accounts</span>
            <span className="reg-demo-tag">Testing only</span>
          </div>
          <p className="reg-demo-note">
            Pre-built accounts for evaluators. Do not use in production.
          </p>
          <div className="reg-demo-grid">
            <button type="button" className="reg-demo-btn reg-demo-btn--full" onClick={fillTestAccount} disabled={loading}>
              Pre-fill test credentials
              <span className="reg-demo-creds">test@safeorder.dz · Test1234!</span>
            </button>
            <button type="button" className="reg-demo-btn" onClick={() => quick('test')} disabled={loading}>
              ⚡ Quick test
            </button>
            <button type="button" className="reg-demo-btn" onClick={() => quick('merchant')} disabled={loading}>
              🏪 TechStore DZ
            </button>
            <button type="button" className="reg-demo-btn" onClick={() => quick('merchant2')} disabled={loading}>
              👔 Fashion Oran
            </button>
            <button type="button" className="reg-demo-btn" onClick={() => quick('admin')} disabled={loading}>
              ⚙️ Admin
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════
   CUSTOMER LOGIN PANEL — phone → OTP
   ════════════════════════════════════════════ */
function CustomerLoginPanel({
  locale,
  onSuccess,
  onDemoLogin,
}: {
  locale: string
  onSuccess: (tokens: { access_token: string; refresh_token: string }, phone: string) => Promise<void>
  onDemoLogin: () => Promise<void>
}) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [needsName, setNeedsName] = useState(false)

  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cleanPhone = (p: string) => p.replace(/\s/g, '')
  const phoneIsValid = (p: string) => /^0\d{9}$/.test(cleanPhone(p))

  const demoLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await onDemoLogin()
    } catch (err: any) {
      setError(err.message || 'Demo login failed')
      setLoading(false)
    }
  }

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phoneIsValid(phone)) {
      setError('Invalid phone number (expected format: 0XXXXXXXXX)')
      return
    }

    setLoading(true)
    try {
      const phoneClean = cleanPhone(phone)
      const exists = await authApi.customerExists(phoneClean)

      if (exists.exists) {
        setMode('login')
        if (exists.first_name) setFirstName(exists.first_name)
      } else {
        setMode('signup')
        if (!firstName.trim() || !lastName.trim()) {
          setNeedsName(true)
          setError('New number — enter your name to create an account')
          setLoading(false)
          return
        }
      }

      const otp = await authApi.sendOtp(phoneClean, exists.exists ? 'login' : 'registration')
      setDemoCode(otp.demo_code ?? null)
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code')
      return
    }
    setLoading(true)
    try {
      const phoneClean = cleanPhone(phone)
      const tokens = await authApi.verifyOtp(
        phoneClean,
        code,
        mode === 'signup' ? 'registration' : 'login',
        {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          language: locale,
        },
      )
      await onSuccess(tokens, phoneClean)
    } catch (err: any) {
      setError(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="reg-panel form-panel" aria-label="Customer sign in" data-form="customer">
      <div className="reg-form-inner">
        <h1 className="reg-form-title">
          {step === 'phone' ? 'Sign in with your phone' : 'Verify your phone'}
        </h1>

        {step === 'phone' ? (
          <form className="reg-form" onSubmit={sendCode} noValidate>
            <Field label="Phone" type="tel" value={phone} onChange={setPhone} required autoComplete="tel" inputMode="tel" placeholder="0551234567" autoFocus />

            {needsName && (
              <div className="reg-row">
                <Field label="First name" value={firstName} onChange={setFirstName} required autoComplete="given-name" />
                <Field label="Last name" value={lastName} onChange={setLastName} required autoComplete="family-name" />
              </div>
            )}

            {error && <div className="reg-error">{error}</div>}

            <button className="reg-btn-primary" type="submit" disabled={loading}>
              {loading ? <Spinner /> : 'Send verification code'}
            </button>

            <div className="reg-demo">
              <div className="reg-demo-title">
                <span>Demo account</span>
                <span className="reg-demo-tag">Testing only</span>
              </div>
              <p className="reg-demo-note">
                Skip the phone step and explore the customer pages instantly.
              </p>
              <div className="reg-demo-grid">
                <button
                  type="button"
                  className="reg-demo-btn reg-demo-btn--full"
                  onClick={demoLogin}
                  disabled={loading}
                >
                  👤 Sign in as a demo customer
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form className="reg-form" onSubmit={verifyCode} noValidate>
            {demoCode && (
              <div className="reg-otp-banner">
                Demo mode — code: <strong>{demoCode}</strong>
              </div>
            )}
            <Field
              label="6-digit code"
              value={code}
              onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
              required
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="123456"
            />

            {error && <div className="reg-error">{error}</div>}

            <button className="reg-btn-primary" type="submit" disabled={loading}>
              {loading ? <Spinner /> : (mode === 'signup' ? 'Create account' : 'Sign in')}
            </button>

            <button type="button" className="reg-link-btn" onClick={() => { setStep('phone'); setCode(''); setError(''); setDemoCode(null) }}>
              ← Change phone number
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
