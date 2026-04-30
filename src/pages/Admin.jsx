import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Admin() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProfiles() }, [])

  async function fetchProfiles() {
    const res = await fetch('/api/admin-profiles')
    const data = await res.json()
    setProfiles(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function updateStatut(userId, statut) {
    await fetch('/api/admin-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, statut }),
    })
  }

  async function approuver(profile) {
    await updateStatut(profile.id, 'approved')
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'approved', to: profile.email, nom: profile.nom || profile.email }),
    }).catch(() => {})
    fetchProfiles()
  }

  async function refuser(profile) {
    if (!confirm(`Refuser l'accès à ${profile.nom || profile.email} ?`)) return
    await updateStatut(profile.id, 'rejected')
    fetchProfiles()
  }

  async function revoquer(profile) {
    if (!confirm(`Révoquer l'accès de ${profile.nom || profile.email} ?`)) return
    await updateStatut(profile.id, 'pending')
    fetchProfiles()
  }

  const pending  = profiles.filter(p => p.statut === 'pending')
  const approved = profiles.filter(p => p.statut === 'approved')
  const rejected = profiles.filter(p => p.statut === 'rejected')

  const tabs = [
    { key: 'pending',  label: 'En attente', count: pending.length,  list: pending },
    { key: 'approved', label: 'Approuvés',  count: approved.length, list: approved },
    { key: 'rejected', label: 'Refusés',    count: rejected.length, list: rejected },
  ]

  const currentList = tabs.find(t => t.key === tab)?.list || []

  return (
    <div style={{ minHeight: '100vh', background: '#060611', padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#3a7bd5', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >←</button>
          <div style={{ color: '#c8e0ff', fontWeight: 800, fontSize: 20 }}>Gestion des accès</div>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                background: tab === t.key ? '#3a7bd5' : '#0c0c24',
                border: `1px solid ${tab === t.key ? '#3a7bd5' : '#1a1a3a'}`,
                color: tab === t.key ? '#fff' : '#3a5080',
                borderRadius: 8,
                padding: '10px 4px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span style={{
                  background: tab === t.key ? 'rgba(255,255,255,0.2)' : '#3a7bd5',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '1px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ color: '#3a5080', textAlign: 'center', padding: 40 }}>Chargement...</div>
        ) : currentList.length === 0 ? (
          <div style={{
            background: '#0c0c24',
            border: '1px dashed #1a1a3a',
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
            color: '#3a5080',
            fontSize: 14,
          }}>
            Aucun utilisateur dans cette catégorie
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentList.map(profile => (
              <div key={profile.id} style={{
                background: '#0c0c24',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  {profile.photo_url ? (
                    <img
                      src={profile.photo_url}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: '#1a1a3a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#3a5080', fontSize: 18, flexShrink: 0,
                    }}>
                      {(profile.nom || profile.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#c8e0ff', fontWeight: 600, fontSize: 14 }}>
                      {profile.nom || '—'}
                    </div>
                    <div style={{ color: '#5a9aee', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile.email}
                    </div>
                    <div style={{ color: '#3a5080', fontSize: 11, marginTop: 2 }}>
                      Demande : {fmt(profile.created_at)}
                      {profile.approved_at && ` · Approuvé : ${fmt(profile.approved_at)}`}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {tab === 'pending' && (
                    <>
                      <button
                        onClick={() => approuver(profile)}
                        style={{
                          flex: 1, background: 'rgba(42,154,90,0.12)', border: '1px solid #2a9a5a',
                          color: '#2a9a5a', borderRadius: 8, padding: '8px', fontSize: 13,
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ✅ Approuver
                      </button>
                      <button
                        onClick={() => refuser(profile)}
                        style={{
                          flex: 1, background: 'rgba(160,74,74,0.12)', border: '1px solid #a04a4a',
                          color: '#a04a4a', borderRadius: 8, padding: '8px', fontSize: 13,
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ❌ Refuser
                      </button>
                    </>
                  )}
                  {tab === 'approved' && profile.role !== 'admin' && (
                    <button
                      onClick={() => revoquer(profile)}
                      style={{
                        flex: 1, background: 'rgba(240,192,64,0.12)', border: '1px solid #f0c040',
                        color: '#f0c040', borderRadius: 8, padding: '8px', fontSize: 13,
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      🔄 Révoquer
                    </button>
                  )}
                  {tab === 'approved' && profile.role === 'admin' && (
                    <div style={{ color: '#3a5080', fontSize: 12, padding: '8px' }}>Admin — non révocable</div>
                  )}
                  {tab === 'rejected' && (
                    <button
                      onClick={() => approuver(profile)}
                      style={{
                        flex: 1, background: 'rgba(42,154,90,0.12)', border: '1px solid #2a9a5a',
                        color: '#2a9a5a', borderRadius: 8, padding: '8px', fontSize: 13,
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      ✅ Approuver quand même
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
