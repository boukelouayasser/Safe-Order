/**
 * Safe Order — Safe Standards Page (FR-03)
 * 3 mandatory conditions before dashboard access.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui'
import LanguagePicker from '../../components/LanguagePicker'

const CONDITIONS = [
  {
    id: 'photos',
    title: 'Authentic photos',
    desc: "Post only real photos of your products. No photos found on the internet or digitally altered in a deceptive way.",
    icon: '📸',
  },
  {
    id: 'description',
    title: 'Complete description',
    desc: "Each product must have a detailed description: size, color, material, weight, and any important details for the customer.",
    icon: '📝',
  },
  {
    id: 'packaging',
    title: 'Careful packaging',
    desc: "Package your products carefully to prevent damage during transport. Use bubble wrap and suitable cardboard.",
    icon: '📦',
  },
]

export default function SafeStandards() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allChecked = checked.size === 3

  const handleAccept = async () => {
    setLoading(true)
    try {
      await authApi.acceptSafeStandards()
    } catch {
      // Either already accepted or transient error — keep going.
    }
    await refreshUser()
    setLoading(false)
    navigate('/merchant/dashboard', { replace: true })
  }

  return (
    <div className="standards">
      <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20 }}>
        <LanguagePicker size="sm" />
      </div>
      <div className="standards__card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 40 }}>🛡</span>
        </div>
        <h2 className="standards__title" style={{ textAlign: 'center' }}>Safe Standards</h2>
        <p className="standards__subtitle" style={{ textAlign: 'center' }}>
          To benefit from Safe Pay and protect your deliveries, you must follow these 3 conditions.
        </p>

        {CONDITIONS.map(c => (
          <div
            key={c.id}
            className={`standards__item ${checked.has(c.id) ? 'standards__item--checked' : ''}`}
            onClick={() => toggle(c.id)}
          >
            <div className="standards__checkbox">
              {checked.has(c.id) && <span style={{ fontSize: 14 }}>✓</span>}
            </div>
            <div>
              <div className="standards__item-title">{c.icon} {c.title}</div>
              <div className="standards__item-desc">{c.desc}</div>
            </div>
          </div>
        ))}

        <Button
          fullWidth
          disabled={!allChecked}
          loading={loading}
          onClick={handleAccept}
          style={{ marginTop: 24 }}
        >
          {allChecked ? "J'accepte les Safe Standards" : 'Cochez les 3 conditions'}
        </Button>
      </div>
    </div>
  )
}
