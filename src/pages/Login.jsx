import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('connexion')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

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

    navigate('/dashboard', { replace: true })
  }

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

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-text-muted text-[10px] uppercase tracking-[2px] font-medium">
            Adresse email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-bg-input border border-border rounded-input px-4 py-3 text-text-primary text-sm outline-none focus:border-accent transition-colors"
            placeholder="vous@exemple.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-muted text-[10px] uppercase tracking-[2px] font-medium">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-bg-input border border-border rounded-input px-4 py-3 text-text-primary text-sm outline-none focus:border-accent transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-loss text-xs text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white rounded-input py-3 text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Chargement…' : mode === 'connexion' ? 'Connexion' : 'Créer un compte'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setError('') }}
          className="border border-border text-[#5a7aaa] rounded-input py-3 text-sm bg-transparent"
        >
          {mode === 'connexion' ? 'Créer un compte' : 'J\'ai déjà un compte'}
        </button>
      </form>
    </div>
  )
}
