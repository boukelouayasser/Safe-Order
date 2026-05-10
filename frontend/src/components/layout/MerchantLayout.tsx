/**
 * Safe Order — Merchant Layout
 * Sidebar navigation + header for the merchant dashboard.
 */
import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import LanguagePicker from '../LanguagePicker'

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

  const NAV_ITEMS = [
    { to: '/merchant/dashboard', label: t('nav.dashboard'), icon: '📊' },
    { to: '/merchant/orders', label: t('nav.orders'), icon: '📦' },
    { to: '/merchant/stats', label: t('nav.stats'), icon: '📈' },
    { to: '/merchant/insights', label: t('nav.insights'), icon: '🧠' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '??'

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">🛡</div>
          <span className="sidebar__logo-text">Safe Order</span>
        </div>

        <nav className="sidebar__nav">
          <span className="sidebar__section">{t('nav.menu_main')}</span>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <span className="sidebar__section">{t('nav.menu_manage')}</span>
          <NavLink
            to="/merchant/create-order"
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__link-icon">➕</span>
            {t('nav.create_order')}
          </NavLink>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">{initials}</div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">
                {merchantProfile?.store_name || `${user?.first_name} ${user?.last_name}`}
              </span>
              <span className="sidebar__user-role">{t('landing.role.merchant')}</span>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <LanguagePicker size="sm" />
          </div>
          <button className="sidebar__link" onClick={handleLogout} style={{ marginTop: 8, width: '100%' }}>
            <span className="sidebar__link-icon">🚪</span>
            {t('common.logout')}
          </button>
        </div>
      </aside>

      <main className="layout__main">
        <header className="layout__header">
          <div className="header__left">
            <div>
              <h1 className="header__title">
                {getPageTitle(location.pathname, t)}
              </h1>
            </div>
          </div>
          <div className="header__right">
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Trust Score: <strong style={{ color: 'var(--color-primary)' }}>{user?.trust_score?.toFixed(0)}/100</strong>
            </span>
          </div>
        </header>

        <div className="layout__content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function getPageTitle(path: string, t: (k: string) => string): string {
  if (path.includes('/create-order')) return t('nav.create_order')
  if (path.includes('/stats')) return t('nav.stats')
  if (path.includes('/insights')) return t('nav.insights')
  if (path.includes('/dashboard')) return t('nav.dashboard')
  // The OrderDetail page renders its own breadcrumb/header — keep the layout title generic here.
  if (/\/orders(\/|$)/.test(path)) return t('nav.orders')
  return 'Safe Order'
}
