/**
 * Safe Order — Landing Page
 * Role + language selection (FR-01).
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'
import LanguagePicker from '../components/LanguagePicker'

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated, user, isLoading } = useAuth()
  const t = useT()

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated && user) {
      if (user.role === 'merchant') navigate('/merchant/dashboard', { replace: true })
      else if (user.role === 'admin') navigate('/admin', { replace: true })
      else if (user.role === 'customer') navigate('/customer', { replace: true })
    }
  }, [isAuthenticated, user, isLoading, navigate])

  return (
    <div className="landing">
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguagePicker />
      </div>

      <div className="landing__hero">
        <div className="landing__hero-content">
          <div className="landing__logo">
            <div className="landing__logo-icon">🛡</div>
            <span className="landing__logo-text">Safe Order</span>
          </div>

          <p className="landing__tagline">{t('app.tagline')}</p>

          <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
            {t('landing.cta.choose_role')}
          </p>

          <div className="landing__roles">
            <div
              className="landing__role-card"
              onClick={() => navigate('/merchant/login')}
            >
              <div className="landing__role-icon">🏪</div>
              <h3 className="landing__role-title">{t('landing.role.merchant')}</h3>
              <p className="landing__role-desc">{t('landing.role.merchant.desc')}</p>
            </div>

            <div
              className="landing__role-card"
              onClick={() => navigate('/customer/login')}
            >
              <div className="landing__role-icon">🛒</div>
              <h3 className="landing__role-title">{t('landing.role.customer')}</h3>
              <p className="landing__role-desc">{t('landing.role.customer.desc')}</p>
            </div>
          </div>

          <div className="landing__features">
            <div className="landing__feature">
              <span className="landing__feature-dot" />
              Safe Pay
            </div>
            <div className="landing__feature">
              <span className="landing__feature-dot" style={{ background: '#0D6E3F' }} />
              Safe Track
            </div>
            <div className="landing__feature">
              <span className="landing__feature-dot" style={{ background: '#F0AE1A' }} />
              Safe Insights
            </div>
            <div className="landing__feature">
              <span className="landing__feature-dot" style={{ background: '#8b5cf6' }} />
              Trust Score
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
