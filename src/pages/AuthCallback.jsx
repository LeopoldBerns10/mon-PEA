import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard')
      else navigate('/login')
    })
  }, [])

  return <div style={{color:'#c8e0ff',textAlign:'center',marginTop:'40vh'}}>Connexion en cours...</div>
}
