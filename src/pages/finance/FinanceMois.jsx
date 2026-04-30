import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/PageWrapper'

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getMoisLabel(date) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default function FinanceMois() {
  const navigate = useNavigate()
  const [moisList, setMoisList] = useState([])
  const [syntheses, setSyntheses] = useState({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchMois() }, [])

  async function fetchMois() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rows } = await supabase
      .from('mois_finance')
      .select('*')
      .eq('user_id', user.id)
      .order('mois', { ascending: false })

    setMoisList(rows || [])

    // Fetch syntheses for each month
    const syns = {}
    await Promise.all((rows || []).map(async (m) => {
      const [r, f, d] = await Promise.all([
        supabase.from('revenus').select('montant').eq('mois_id', m.id),
        supabase.from('factures_mois').select('montant_reel, montant_prevu').eq('mois_id', m.id),
        supabase.from('depenses').select('montant').eq('mois_id', m.id),
      ])
      const rev = (r.data || []).reduce((s, x) => s + Number(x.montant), 0)
      const fac = (f.data || []).reduce((s, x) => s + Number(x.montant_reel ?? x.montant_prevu ?? 0), 0)
      const dep = (d.data || []).reduce((s, x) => s + Number(x.montant), 0)
      syns[m.id] = { revenus: rev, depenses: fac + dep, solde: rev - fac - dep }
    }))
    setSyntheses(syns)
    setLoading(false)
  }

  async function nouveauMois() {
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Compute next month
    const today = new Date()
    const nextMois = new Date(today.getFullYear(), today.getMonth(), 1)
    const moisStr = nextMois.toISOString().split('T')[0]

    // Create mois_finance
    const { data: newMois, error } = await supabase
      .from('mois_finance')
      .insert({ user_id: user.id, mois: moisStr })
      .select()
      .single()

    if (error) {
      alert('Ce mois existe déjà ou erreur : ' + error.message)
      setCreating(false)
      return
    }

    // Copy active factures_fixes into factures_mois
    const { data: fixes } = await supabase
      .from('factures_fixes')
      .select('*')
      .eq('user_id', user.id)
      .eq('actif', true)

    if (fixes && fixes.length > 0) {
      await supabase.from('factures_mois').insert(
        fixes.map(f => ({
          user_id: user.id,
          mois_id: newMois.id,
          facture_fixe_id: f.id,
          nom: f.nom,
          montant_prevu: f.montant,
          paye: false,
        }))
      )
    }

    setCreating(false)
    navigate(`/finance/mois/${newMois.id}`)
  }

  if (loading) {
    return (
      <PageWrapper>
        <div style={{ padding: 24, color: '#3a5080', textAlign: 'center' }}>Chargement...</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 18 }}>Mes mois</div>
          <button
            onClick={nouveauMois}
            disabled={creating}
            style={{
              background: '#3a7bd5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? '...' : '+ Nouveau mois'}
          </button>
        </div>

        {moisList.length === 0 ? (
          <div style={{
            background: '#0c0c24',
            border: '1px dashed #1a1a3a',
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ color: '#c8e0ff', fontWeight: 700, marginBottom: 8 }}>Aucun mois créé</div>
            <div style={{ color: '#3a5080', fontSize: 13 }}>Crée ton premier mois pour commencer à budgéter</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {moisList.map(m => {
              const syn = syntheses[m.id] || {}
              const solde = syn.solde ?? 0
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/finance/mois/${m.id}`)}
                  style={{
                    background: '#0c0c24',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '16px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
                      {getMoisLabel(m.mois)}
                    </div>
                    <div style={{ color: '#3a5080', fontSize: 12, marginTop: 4 }}>
                      Revenus {fmt(syn.revenus || 0)} € · Dépenses {fmt(syn.depenses || 0)} €
                    </div>
                  </div>
                  <div style={{
                    color: solde >= 0 ? '#2a9a5a' : '#a04a4a',
                    fontWeight: 700,
                    fontSize: 16,
                  }}>
                    {solde >= 0 ? '+' : ''}{fmt(solde)} €
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
