import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Avatar({ user }) {
  const photo = user?.user_metadata?.avatar_url
  const initiale = user?.user_metadata?.full_name?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || '?'

  if (photo) {
    return (
      <img
        src={photo}
        alt="avatar"
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    )
  }

  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
      style={{ backgroundColor: '#3a7bd5' }}
    >
      {initiale}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-card p-5 ${className}`}
    >
      {children}
    </div>
  )
}

function StatLabel({ children }) {
  return (
    <p className="text-text-muted text-[10px] uppercase tracking-[2px] font-medium mb-2">
      {children}
    </p>
  )
}

function StatValue({ children, color }) {
  return (
    <p className="text-[22px] font-bold" style={{ color: color || '#e8f0ff' }}>
      {children}
    </p>
  )
}

const NAV_ITEMS = [
  {
    label: 'Accueil',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Ordres',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    label: 'Conseils',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const prenom = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.email
    || ''

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-6">
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-[2px]">Bienvenue</p>
          <h1 className="text-text-primary text-lg font-bold mt-0.5">{prenom}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSignOut}
            className="text-text-muted text-[11px] uppercase tracking-widest hover:text-text-primary transition-colors"
          >
            Sortir
          </button>
          <Avatar user={user} />
        </div>
      </div>

      {/* Cartes */}
      <div className="flex flex-col gap-4 px-5 pb-28">
        {/* Valeur du portefeuille */}
        <Card>
          <StatLabel>Valeur du portefeuille</StatLabel>
          <StatValue>0,00 €</StatValue>
        </Card>

        {/* Investi + Gain net */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <StatLabel>Investi</StatLabel>
            <StatValue>0,00 €</StatValue>
          </Card>
          <Card>
            <StatLabel>Gain net</StatLabel>
            <StatValue color="#4a9a6a">0,00 €</StatValue>
          </Card>
        </div>

        {/* Liquidités */}
        <Card>
          <StatLabel>Liquidités disponibles</StatLabel>
          <StatValue>0,00 €</StatValue>
        </Card>
      </div>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-bg-card border-t border-border flex justify-around py-3 px-2"
      >
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.label}
            onClick={() => setActiveTab(i)}
            className="flex flex-col items-center gap-1 px-4 py-1 transition-colors"
            style={{ color: activeTab === i ? '#3a7bd5' : '#3a4a70' }}
          >
            {item.icon}
            <span className="text-[10px] uppercase tracking-widest font-medium">
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
