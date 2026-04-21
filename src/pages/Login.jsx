import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function toEmail(identifiant) {
  return `${identifiant.trim().toLowerCase()}@monpea.app`
}

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('connexion')
  const [identifiant, setIdentifiant] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inscriptionOk, setInscriptionOk] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  function resetForm() {
    setIdentifiant('')
    setPassword('')
    setConfirm('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'inscription' && password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const email = toEmail(identifiant)

    let result
    if (mode === 'connexion') {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else {
      result = await supabase.auth.signUp({ email, password })
    }

    setLoading(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (mode === 'inscription') {
      setInscriptionOk(true)
      setTimeout(() => {
        setInscriptionOk(false)
        setMode('connexion')
        resetForm()
      }, 3000)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  const inputClass =
    'bg-bg-input border border-border rounded-input px-4 py-3 text-text-primary text-sm outline-none focus:border-accent transition-colors'
  const labelClass =
    'text-text-muted text-[10px] uppercase tracking-[2px] font-medium'

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-12 h-12 rounded-input flex items-center justify-center mb-3"
          style={{ backgroundColor: '#3a7bd5' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <h1 className="text-text-primary font-bold text-xl tracking-wide">Mon PEA</h1>
        <p className="text-text-muted text-xs tracking-widest uppercase mt-1">Suivi de portefeuille</p>
      </div>

      {/* Message post-inscription */}
      {inscriptionOk && (
        <div className="w-full max-w-sm bg-bg-card border border-border rounded-card p-5 text-center">
          <p className="text-gain text-sm leading-relaxed">
            Compte créé avec succès. En attente de validation par l'administrateur. Vous serez contacté.
          </p>
        </div>
      )}

      {/* Formulaire */}
      {!inscriptionOk && (
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Identifiant</label>
            <input
              type="text"
              value={identifiant}
              onChange={e => setIdentifiant(e.target.value)}
              required
              autoComplete="username"
              className={inputClass}
              placeholder="votre identifiant"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {mode === 'inscription' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p className="text-loss text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white rounded-input py-3 text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Chargement…' : mode === 'connexion' ? 'Connexion' : 'Créer mon compte'}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); resetForm() }}
            className="border border-border text-[#5a7aaa] rounded-input py-3 text-sm bg-transparent"
          >
            {mode === 'connexion' ? 'Créer un compte' : 'J\'ai déjà un compte'}
          </button>
        </form>
      )}
    </div>
  )
}
