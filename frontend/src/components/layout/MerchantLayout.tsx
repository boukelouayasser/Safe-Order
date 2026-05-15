/**
 * Safe Order — Merchant Layout
 * Dark navy sidebar + white topbar for the merchant dashboard area.
 */
import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'

const NAV_MAIN = [
  {
    to: '/merchant/dashboard',
    key: 'nav.dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    to: '/merchant/orders',
    key: 'nav.orders',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    to: '/merchant/stats',
    key: 'nav.stats',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="M7 15l4-4 4 4 5-7" />
      </svg>
    ),
  },
  {
    to: '/merchant/insights',
    key: 'nav.insights',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.7.8 3.2 2 4.2V15a2 2 0 0 0 2 2h.5" />
        <path d="M14.5 2A5.5 5.5 0 0 1 20 7.5c0 1.7-.8 3.2-2 4.2V15a2 2 0 0 1-2 2h-.5" />
        <path d="M10 22h4" /><path d="M9 17h6" />
      </svg>
    ),
  },
]

export default function MerchantLayout() {
  const { user, merchantProfile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  // Safe Standards gate (FR-03): dashboard is locked until the 3 conditions are accepted.
  useEffect(() => {
    if (
      merchantProfile &&
      !merchantProfile.safe_standards_accepted &&
      !location.pathname.startsWith('/merchant/safe-standards')
    ) {
      navigate('/merchant/safe-standards', { replace: true })
    }
  }, [merchantProfile, location.pathname, navigate])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = user
    ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()
    : '??'

  const { title, crumb } = pageMeta(location.pathname, t)
  const trustScore = user?.trust_score != null ? Math.round(user.trust_score) : null
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `md-sb-link ${isActive ? 'active' : ''}`

  return (
    <div className="md-app">
      {/* ============== SIDEBAR ============== */}
      <aside className="md-sidebar">
        <NavLink to="/merchant/dashboard" className="md-sb-brand">
          <img className="mark" src="/logo_safe_order.png" alt="Safe-Order" />
          <div className="name">Safe<span>-</span>Order</div>
        </NavLink>

        <div className="md-sb-section">{t('nav.menu_main')}</div>
        <nav className="md-sb-nav">
          {NAV_MAIN.map(item => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.icon}
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="md-sb-section">{t('nav.menu_manage')}</div>
        <nav className="md-sb-nav">
          <NavLink to="/merchant/create-order" className={linkClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            {t('nav.create_order')}
          </NavLink>
        </nav>

        <div className="md-sb-spacer" />

        <div className="md-sb-user">
          <div className="md-sb-avatar">{initials}</div>
          <div className="meta">
            <div className="n">
              {merchantProfile?.store_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`}
            </div>
            <div className="r">{t('landing.role.merchant')}</div>
          </div>
        </div>

        <div className="md-sb-logout">
          <button onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* ============== MAIN ============== */}
      <main className="md-main">
        <header className="md-topbar">
          <div>
            <div className="crumb">{crumb}</div>
            <h1>{title}</h1>
          </div>
          <div className="right">
            <div className="md-topbar-tools">
              <button className="md-toolbtn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {monthLabel}
              </button>
              <button className="md-icon-btn" type="button" aria-label="Notifications">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="dot" />
              </button>
            </div>
            {trustScore != null && (
              <div className="md-trust-pill">
                <span className="shield">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                Trust Score: <b>{trustScore}/100</b>
              </div>
            )}
          </div>
        </header>

        <div className="md-canvas">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function pageMeta(path: string, t: (k: string) => string): { title: string; crumb: string } {
  if (path.includes('/create-order')) return { title: t('nav.create_order'), crumb: 'Merchant · Create' }
  if (path.includes('/stats')) return { title: t('nav.stats'), crumb: 'Merchant · Analytics' }
  if (path.includes('/insights')) return { title: t('nav.insights'), crumb: 'Merchant · AI Insights' }
  if (path.includes('/dashboard')) return { title: t('nav.dashboard'), crumb: 'Merchant · Overview' }
  if (/\/orders(\/|$)/.test(path)) return { title: t('nav.orders'), crumb: 'Merchant · Orders' }
  return { title: 'Safe-Order', crumb: 'Merchant' }
}
