import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Logo from './Logo'

const NAV = [
  {
    path: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/ordres',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    path: '/injections',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    path: '/ventes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const photo = user?.user_metadata?.avatar_url
  const initiale = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <aside
      className="hidden md:flex fixed top-0 left-0 h-screen w-16 flex-col items-center py-5 z-50"
      style={{ backgroundColor: '#07071a', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo icône seule */}
      <button onClick={() => navigate('/dashboard')} className="mb-8">
        <Logo iconOnly />
      </button>

      {/* Nav */}
      <div className="flex flex-col gap-2 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={item.path.replace('/', '')}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{
                backgroundColor: active ? '#1e3a6e' : 'transparent',
                color: active ? '#5a9aee' : '#2a3a6a',
              }}
            >
              {item.icon}
            </button>
          )
        })}
      </div>

      {/* Avatar */}
      <div>
        {photo
          ? <img src={photo} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
          : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#3a7bd5' }}>
              {initiale}
            </div>
          )
        }
      </div>
    </aside>
  )
}
