/**
 * Safe Order — slim top bar shared by the customer-facing pages.
 */
import { Link } from 'react-router-dom'

export default function CustomerHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="cs-topbar">
      <Link to="/" className="cs-brand">
        <img src="/logo_safe_order.png" alt="Safe-Order" />
        <span>Safe<i>-</i>Order</span>
      </Link>
      {actions && <div className="cs-topbar-actions">{actions}</div>}
    </header>
  )
}
