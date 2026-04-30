import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/PageWrapper'

const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getMoisLabel(date) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function getAnneesDisponibles() {
  const anneeActuelle = new Date().getFullYear()
  return [anneeActuelle - 2, anneeActuelle - 1, anneeActuelle, anneeActuelle + 1]
}

export default function FinanceMois() {
  const navigate = useNavigate()
  const [moisList, setMoisList] = useState([])
  const [syntheses, setSyntheses] = useState({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const today = new Date()
  const [pickerMois, setPickerMois] = useState(today.getMonth()) // 0-11
  const [pickerAnnee, setPickerAnnee] = useState(today.getFullYear())

  useEffect(() => { fetchMois() }, [])

  async function fetchMois() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rows } = await supabase
      .from('mois_finance')
      .select('*')
      .eq('user_id', user.id)
      .order('mois', { ascending: false })

    setMoisList(rows || [])

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

  async function creerMois() {
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Construire la date au format YYYY-MM-DD (1er du mois sélectionné)
    const moisStr = `${pickerAnnee}-${String(pickerMois + 1).padStart(2, '0')}-01`

    // Vérifier si ce mois existe déjà
    const { data: existing } = await supabase
      .from('mois_finance')
      .select('id')
      .eq('user_id', user.id)
      .eq('mois', moisStr)
      .single()

    if (existing) {
      setShowPicker(false)
      setCreating(false)
      navigate(`/finance/mois/${existing.id}`)
      return
    }

    // Créer le mois
    const { data: newMois, error } = await supabase
      .from('mois_finance')
      .insert({ user_id: user.id, mois: moisStr })
      .select()
      .single()

    if (error) {
      alert('Erreur : ' + error.message)
      setCreating(false)
      return
    }

    // Copier les factures fixes actives
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

    // Reporter le solde du dernier mois clôturé AVANT ce mois
    const { data: dernierCloture } = await supabase
      .from('mois_finance')
      .select('solde_fin, mois')
      .eq('user_id', user.id)
      .eq('cloture', true)
      .lt('mois', moisStr)
      .order('mois', { ascending: false })
      .limit(1)
      .single()

    if (dernierCloture?.solde_fin > 0) {
      await supabase.from('revenus').insert({
        user_id: user.id,
        mois_id: newMois.id,
        label: `Report ${getMoisLabel(dernierCloture.mois)}`,
        montant: dernierCloture.solde_fin,
      })
      await supabase.from('mois_finance').update({
        solde_reporte: dernierCloture.solde_fin,
      }).eq('id', newMois.id)
    }

    setShowPicker(false)
    setCreating(false)
    navigate(`/finance/mois/${newMois.id}`)
  }

  async function supprimerMois(e, mois) {
    e.stopPropagation()
    const label = getMoisLabel(mois.mois)
    if (!confirm(`Supprimer le mois de ${label} et toutes ses données ?`)) return
    await supabase.from('mois_finance').delete().eq('id', mois.id)
    fetchMois()
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 18 }}>Mes mois</div>
          <button
            onClick={() => setShowPicker(true)}
            style={{
              background: '#3a7bd5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Nouveau mois
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
              const solde = m.cloture ? m.solde_fin : (syn.solde ?? 0)
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/finance/mois/${m.id}`)}
                  style={{
                    background: '#0c0c24',
                    border: `1px solid ${m.cloture ? 'rgba(42,154,90,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
                        {getMoisLabel(m.mois)}
                      </div>
                      {m.cloture && (
                        <span style={{
                          background: 'rgba(42,154,90,0.15)',
                          color: '#2a9a5a',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 6,
                          padding: '2px 8px',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}>Clôturé</span>
                      )}
                    </div>
                    <div style={{
                      color: (solde ?? 0) >= 0 ? '#2a9a5a' : '#a04a4a',
                      fontWeight: 700,
                      fontSize: 15,
                    }}>
                      {(solde ?? 0) >= 0 ? '+' : ''}{fmt(solde)} €
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: '#3a5080', fontSize: 12 }}>
                      {m.cloture
                        ? `Épargné : ${fmt(m.total_epargne)} € · Solde : ${fmt(m.solde_fin)} €`
                        : `Revenus ${fmt(syn.revenus || 0)} € · Dépenses ${fmt(syn.depenses || 0)} €`
                      }
                    </div>
                    <button
                      onClick={(e) => supprimerMois(e, m)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #a04a4a',
                        color: '#a04a4a',
                        borderRadius: '999px',
                        padding: '3px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal sélecteur mois/année */}
      {showPicker && (
        <div
          onClick={() => setShowPicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0c0c24', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 430 }}
          >
            <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              📅 Créer un mois
            </div>

            {/* Sélecteur mois */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#3a5080', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Mois</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {MOIS_NOMS.map((nom, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPickerMois(idx)}
                    style={{
                      background: pickerMois === idx ? '#3a7bd5' : '#060611',
                      border: `1px solid ${pickerMois === idx ? '#3a7bd5' : '#1a1a3a'}`,
                      color: pickerMois === idx ? '#fff' : '#3a5080',
                      borderRadius: 8,
                      padding: '8px 4px',
                      fontSize: 12,
                      fontWeight: pickerMois === idx ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {nom.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélecteur année */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#3a5080', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Année</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {getAnneesDisponibles().map(annee => (
                  <button
                    key={annee}
                    onClick={() => setPickerAnnee(annee)}
                    style={{
                      flex: 1,
                      background: pickerAnnee === annee ? '#3a7bd5' : '#060611',
                      border: `1px solid ${pickerAnnee === annee ? '#3a7bd5' : '#1a1a3a'}`,
                      color: pickerAnnee === annee ? '#fff' : '#3a5080',
                      borderRadius: 8,
                      padding: '10px 4px',
                      fontSize: 13,
                      fontWeight: pickerAnnee === annee ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {annee}
                  </button>
                ))}
              </div>
            </div>

            {/* Aperçu */}
            <div style={{
              background: '#060611',
              border: '1px solid #1a1a3a',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              color: '#c8e0ff',
              fontSize: 14,
              textAlign: 'center',
              textTransform: 'capitalize',
            }}>
              {MOIS_NOMS[pickerMois]} {pickerAnnee}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowPicker(false)}
                style={{ flex: 1, background: '#1a1a3a', border: 'none', borderRadius: 8, padding: '12px', color: '#3a5080', fontSize: 14, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={creerMois}
                disabled={creating}
                style={{ flex: 2, background: '#3a7bd5', border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.6 : 1 }}
              >
                {creating ? 'Création...' : `Créer ${MOIS_NOMS[pickerMois]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
