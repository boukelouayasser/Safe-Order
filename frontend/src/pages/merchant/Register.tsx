/**
 * Safe Order — Registration page (FR-02)
 *
 * Three-panel sliding layout shared by /, /merchant/register, /customer/register.
 * Merchant side: full email+password registration via /api/auth/register/merchant.
 * Customer side: phone-only registration via the existing OTP flow
 * (sendOtp → verifyOtp), since the customer API is OTP-based.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n'
import AuthShell, {
  AuthView, Field, PWD_BAR_COLORS, SelectField, Spinner, strengthOf,
} from '../auth/AuthShell'
import '../../styles/auth.css'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithTokens } = useAuth()
  const { locale } = useLanguage()

  // Prefer the panel explicitly carried over from the Login page (via Link
  // state) so switching Sign-in ↔ Sign-up never flips Merchant/Customer.
  // Fall back to the URL prefix for direct visits.
  const navView = (location.state as { authView?: AuthView } | null)?.authView
  const initialView: AuthView =
    navView === 'merchant' || navView === 'customer'
      ? navView
      : location.pathname.startsWith('/merchant') ? 'merchant' : 'customer'
  const [view, setView] = useState<AuthView>(initialView)

  return (
    <AuthShell
      view={view}
      setView={setView}
      altLinkLabel="Sign in →"
      altLinkTo={view === 'merchant' ? '/merchant/login' : '/customer/login'}
      merchantPanel={
        <MerchantRegisterPanel
          onSuccess={async tokens => {
            await loginWithTokens(tokens)
            navigate('/merchant/safe-standards', { replace: true })
          }}
        />
      }
      customerPanel={
        <CustomerRegisterPanel
          locale={locale}
          onSuccess={async (tokens, phone) => {
            const u = await loginWithTokens(tokens)
            localStorage.setItem('customer_phone', u.phone || phone)
            navigate('/customer', { replace: true })
          }}
        />
      }
    />
  )
}

/* ════════════════════════════════════════════
   MERCHANT PANEL
   ════════════════════════════════════════════ */
function MerchantRegisterPanel({
  onSuccess,
}: {
  onSuccess: (tokens: { access_token: string; refresh_token: string }) => Promise<void>
}) {
  const [wilayas, setWilayas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '', last_name: '', store_name: '',
    phone: '', email: '', password: '',
    wilaya: '', municipality: '',
  })

  useEffect(() => {
    authApi.getWilayas().then(setWilayas).catch(() => {})
  }, [])

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const pwdScore = strengthOf(form.password)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ''))) {
      setError('Invalid phone number (expected format: 0XXXXXXXXX)')
      return
    }
    if (!form.wilaya) {
      setError('Please select a wilaya')
      return
    }

    setLoading(true)
    try {
      const tokens = await authApi.registerMerchant({
        first_name: form.first_name,
        last_name: form.last_name,
        store_name: form.store_name,
        phone: form.phone.replace(/\s/g, ''),
        email: form.email,
        password: form.password,
        wilaya: form.wilaya,
        municipality: form.municipality,
        delivery_companies: [],
      })
      await onSuccess(tokens)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="reg-panel form-panel" aria-label="Merchant registration" data-form="merchant">
      <div className="reg-form-inner">
        <h1 className="reg-form-title">Create your business account</h1>

        <form className="reg-form" onSubmit={submit} noValidate>
          <Field label="Business name" value={form.store_name} onChange={v => update('store_name', v)} required autoComplete="organization" />

          <div className="reg-row">
            <Field label="First name" value={form.first_name} onChange={v => update('first_name', v)} required autoComplete="given-name" />
            <Field label="Last name" value={form.last_name} onChange={v => update('last_name', v)} required autoComplete="family-name" />
          </div>

          <Field label="Email" type="email" value={form.email} onChange={v => update('email', v)} required autoComplete="email" placeholder="you@business.com" />

          <Field label="Phone" type="tel" value={form.phone} onChange={v => update('phone', v)} required autoComplete="tel" inputMode="tel" placeholder="0551234567" />

          <div className="reg-row">
            <SelectField
              label="Wilaya"
              value={form.wilaya}
              onChange={v => update('wilaya', v)}
              options={wilayas.map(w => ({ value: w, label: w }))}
              required
            />
            <Field label="City" value={form.municipality} onChange={v => update('municipality', v)} />
          </div>

          <Field label="Password" pwdToggle value={form.password} onChange={v => update('password', v)} required autoComplete="new-password" placeholder="At least 8 characters" />
          <div className="reg-pwd-strength">
            <div className="bar" style={{ width: `${pwdScore * 25}%`, background: PWD_BAR_COLORS[pwdScore] }} />
          </div>

          {error && <div className="reg-error">{error}</div>}

          <button className="reg-btn-primary" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Create account'}
          </button>
        </form>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════
   CUSTOMER PANEL — phone + OTP, two steps
   ════════════════════════════════════════════ */
function CustomerRegisterPanel({
  locale,
  onSuccess,
}: {
  locale: string
  onSuccess: (tokens: { access_token: string; refresh_token: string }, phone: string) => Promise<void>
}) {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('signup')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cleanPhone = (p: string) => p.replace(/\s/g, '')
  const phoneIsValid = (p: string) => /^0\d{9}$/.test(cleanPhone(p))

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
        if (exists.first_name && !firstName) setFirstName(exists.first_name)
      } else {
        setMode('signup')
        if (!firstName.trim() || !lastName.trim()) {
          setError('First and last name are required to create an account')
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
    <section className="reg-panel form-panel" aria-label="Customer registration" data-form="customer">
      <div className="reg-form-inner">
        <h1 className="reg-form-title">
          {step === 'form' ? 'Create your account' : 'Verify your phone'}
        </h1>

        {step === 'form' ? (
          <form className="reg-form" onSubmit={sendCode} noValidate>
            <div className="reg-row">
              <Field label="First name" value={firstName} onChange={setFirstName} required autoComplete="given-name" />
              <Field label="Last name" value={lastName} onChange={setLastName} required autoComplete="family-name" />
            </div>

            <Field label="Phone" type="tel" value={phone} onChange={setPhone} required autoComplete="tel" inputMode="tel" placeholder="0551234567" />

            {error && <div className="reg-error">{error}</div>}

            <button className="reg-btn-primary" type="submit" disabled={loading}>
              {loading ? <Spinner /> : 'Send verification code'}
            </button>
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

            <button type="button" className="reg-link-btn" onClick={() => { setStep('form'); setCode(''); setError(''); setDemoCode(null) }}>
              ← Change phone number
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
