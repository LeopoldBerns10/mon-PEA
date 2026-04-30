import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getUserProfile } from '../lib/supabase'
import { PendingPage, RejectedPage } from '../pages/Pending'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading')
  const [userEmail, setUserEmail] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/login')
        return
      }

      setUserEmail(session.user.email || '')
      const { data: profile, error } = await getUserProfile(session.user.id)
      console.log('ProtectedRoute — user id:', session.user.id, '| profile:', profile, '| error:', error)

      if (!profile || profile.statut === 'pending') {
        // Notifier l'admin seulement à la première connexion (profil créé dans les 2 min)
        const isNew = !profile || (new Date() - new Date(profile.created_at) < 120000)
        const alreadyNotified = localStorage.getItem(`notified_${session.user.id}`)
        if (isNew && !alreadyNotified) {
          localStorage.setItem(`notified_${session.user.id}`, '1')
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_request',
              to: session.user.email,
              nom: session.user.user_metadata?.full_name || session.user.email,
            }),
          }).catch(() => {})
        }
        setStatus('pending')
      } else if (profile.statut === 'rejected') {
        sessionStorage.removeItem('userRole')
        setStatus('rejected')
      } else if (profile.statut === 'approved') {
        sessionStorage.setItem('userRole', profile.role || 'user')
        setStatus('approved')
      }
    })
  }, [])

  if (status === 'loading') return (
    <div style={{ color: '#c8e0ff', textAlign: 'center', marginTop: '40vh', fontSize: 16 }}>
      Chargement...
    </div>
  )
  if (status === 'pending') return <PendingPage email={userEmail} />
  if (status === 'rejected') return <RejectedPage />
  return children
}

export function AdminRoute({ children }) {
  const [ok, setOk] = useState('loading')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login'); return }
      const { data: profile } = await getUserProfile(session.user.id)
      if (profile?.role === 'admin' && profile?.statut === 'approved') {
        setOk('ok')
      } else {
        navigate('/dashboard')
      }
    })
  }, [])

  if (ok === 'loading') return (
    <div style={{ color: '#c8e0ff', textAlign: 'center', marginTop: '40vh', fontSize: 16 }}>
      Chargement...
    </div>
  )
  return children
}
