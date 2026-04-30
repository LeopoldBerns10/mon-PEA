import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

const PEA_ROUTES = ['/dashboard', '/ordres', '/injections', '/ventes', '/actifs']

export default function PageWrapper({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAdmin = sessionStorage.getItem('userRole') === 'admin'

  const isFinance = pathname.startsWith('/finance')
  const actif = isFinance ? 'finance' : 'pea'

  return (
    <div className="min-h-screen bg-bg-root">
      <Sidebar />
      <div className="md:ml-16 min-h-screen flex flex-col">
        {/* Toggle switch PEA / Finance */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: '#060611',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              title="Administration"
              style={{
                background: 'transparent',
                border: '1px solid #1a1a3a',
                color: '#3a5080',
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              ⚙ Admin
            </button>
          )}
          <div style={{
            display: 'flex',
            background: '#0c0c24',
            border: '1px solid #1a1a3a',
            borderRadius: '999px',
            padding: '4px',
            gap: '4px',
          }}>
            <button
              style={{
                background: actif === 'pea' ? '#3a7bd5' : 'transparent',
                color: actif === 'pea' ? '#fff' : '#3a5080',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => navigate('/dashboard')}
            >
              📈 Mon PEA
            </button>
            <button
              style={{
                background: actif === 'finance' ? '#3a7bd5' : 'transparent',
                color: actif === 'finance' ? '#fff' : '#3a5080',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => navigate('/finance')}
            >
              💰 Finance
            </button>
          </div>
          </div>
        </div>

        <div className="flex-1 pb-20 md:pb-0">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
