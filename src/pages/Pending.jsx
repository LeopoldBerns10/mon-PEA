import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function PendingPage({ email }) {
  async function deconnecter() {
    sessionStorage.removeItem('userRole')
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060611',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ color: '#3a7bd5', fontWeight: 800, fontSize: 20, marginBottom: 32, letterSpacing: 1 }}>
          Mon PEA
        </div>

        <div style={{ fontSize: 56, marginBottom: 20 }}>⏳</div>

        <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
          Demande envoyée
        </div>

        <div style={{ color: '#3a5080', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          Votre compte est en attente de validation par l'administrateur.
          Vous recevrez un email dès que votre accès sera activé.
        </div>

        {email && (
          <div style={{
            display: 'inline-block',
            background: '#0c0c24',
            border: '1px solid #1a1a3a',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#5a9aee',
            fontSize: 14,
            marginBottom: 32,
          }}>
            {email}
          </div>
        )}

        <div>
          <button
            onClick={deconnecter}
            style={{
              background: 'transparent',
              border: '1px solid #3a5080',
              color: '#3a5080',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

export function RejectedPage() {
  async function deconnecter() {
    sessionStorage.removeItem('userRole')
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060611',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ color: '#3a7bd5', fontWeight: 800, fontSize: 20, marginBottom: 32, letterSpacing: 1 }}>
          Mon PEA
        </div>

        <div style={{ fontSize: 56, marginBottom: 20 }}>❌</div>

        <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
          Accès refusé
        </div>

        <div style={{ color: '#3a5080', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          Votre demande d'accès n'a pas été acceptée.
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="mailto:leopoldberns10@gmail.com"
            style={{
              background: '#3a7bd5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Contacter l'admin
          </a>
          <button
            onClick={deconnecter}
            style={{
              background: 'transparent',
              border: '1px solid #3a5080',
              color: '#3a5080',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

export default PendingPage
