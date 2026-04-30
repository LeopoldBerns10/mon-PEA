import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/PageWrapper'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

const CATEGORIES = [
  { id: 'nourriture',  label: 'Nourriture',  emoji: '🛒', color: '#3a7bd5' },
  { id: 'essence',     label: 'Essence',      emoji: '⛽', color: '#f0c040' },
  { id: 'loisirs',     label: 'Loisirs',      emoji: '🎮', color: '#8b5cf6' },
  { id: 'restaurant',  label: 'Restaurant',   emoji: '🍔', color: '#f97316' },
  { id: 'sante',       label: 'Santé',        emoji: '💊', color: '#2a9a5a' },
  { id: 'vetements',   label: 'Vêtements',    emoji: '👕', color: '#ec4899' },
  { id: 'transport',   label: 'Transport',    emoji: '🚗', color: '#06b6d4' },
  { id: 'autre',       label: 'Autre',        emoji: '📦', color: '#3a5080' },
]

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getMoisLabel(date) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default function FinanceDashboard() {
  const navigate = useNavigate()
  const [moisList, setMoisList] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [data, setData] = useState({ revenus: [], factures: [], depenses: [], versements: [] })
  const [loading, setLoading] = useState(true)
  const [showDepenseModal, setShowDepenseModal] = useState(false)
  const [newDep, setNewDep] = useState({ label: '', montant: '', categorie: 'autre' })

  useEffect(() => { fetchMois() }, [])

  useEffect(() => {
    if (moisList.length > 0) fetchData(moisList[currentIdx].id)
  }, [currentIdx, moisList])

  async function fetchMois() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rows } = await supabase
      .from('mois_finance')
      .select('*')
      .eq('user_id', user.id)
      .order('mois', { ascending: false })
    setMoisList(rows || [])
    setLoading(false)
  }

  async function fetchData(moisId) {
    const [r, f, d, v] = await Promise.all([
      supabase.from('revenus').select('*').eq('mois_id', moisId),
      supabase.from('factures_mois').select('*').eq('mois_id', moisId),
      supabase.from('depenses').select('*').eq('mois_id', moisId),
      supabase.from('versements_epargne').select('*').eq('mois_id', moisId),
    ])
    setData({
      revenus: r.data || [],
      factures: f.data || [],
      depenses: d.data || [],
      versements: v.data || [],
    })
  }

  const mois = moisList[currentIdx]
  const today = new Date()

  const totalRevenus = data.revenus.reduce((s, r) => s + Number(r.montant), 0)
  const totalFactures = data.factures.reduce((s, f) => s + Number(f.montant_reel ?? f.montant_prevu ?? 0), 0)
  const totalDepenses = data.depenses.reduce((s, d) => s + Number(d.montant), 0)
  const totalVersements = data.versements.reduce((s, v) => s + Number(v.montant), 0)

  // Déterminer si le mois affiché est courant, passé ou futur
  const moisDate = mois ? new Date(mois.mois) : null
  const debutMoisCourant = new Date(today.getFullYear(), today.getMonth(), 1)
  const debutMoisAffiche = moisDate ? new Date(moisDate.getFullYear(), moisDate.getMonth(), 1) : null
  const isCurrentMonth = debutMoisAffiche && debutMoisAffiche.getTime() === debutMoisCourant.getTime()
  const isPastMonth = debutMoisAffiche && debutMoisAffiche < debutMoisCourant

  // Factures déjà déduites du compte (selon le jour de prélèvement)
  const facturesDeduites = data.factures.reduce((s, f) => {
    const montant = Number(f.montant_reel ?? f.montant_prevu ?? 0)
    if (isPastMonth) return s + montant              // mois passé : tout est prélevé
    if (!isCurrentMonth) return s                    // mois futur : rien encore prélevé
    // mois courant : prélevé si le jour est passé OU si marqué payé
    const jourPrelev = f.jour_prelevement || 1
    return (jourPrelev <= today.getDate() || f.paye) ? s + montant : s
  }, 0)

  // Factures encore à venir ce mois (pas encore sur le compte)
  const facturesAVenir = totalFactures - facturesDeduites

  // Ce qui est sur le compte maintenant
  const soldeSurCompte = totalRevenus - totalDepenses - facturesDeduites
  // Ce qu'il restera après toutes les factures
  const soldeApresFactures = totalRevenus - totalDepenses - totalFactures
  // Après versements en plus
  const soldeFinal = soldeApresFactures - totalVersements

  const depParCategorie = CATEGORIES.map(cat => ({
    name: cat.emoji + ' ' + cat.label,
    montant: data.depenses.filter(d => d.categorie === cat.id).reduce((s, d) => s + Number(d.montant), 0),
    color: cat.color,
  })).filter(c => c.montant > 0)

  async function ajouterDepense() {
    if (!newDep.label || !newDep.montant || !mois) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('depenses').insert({
      user_id: user.id,
      mois_id: mois.id,
      label: newDep.label,
      montant: parseFloat(newDep.montant),
      categorie: newDep.categorie,
      date: new Date().toISOString().split('T')[0],
    })
    setNewDep({ label: '', montant: '', categorie: 'autre' })
    setShowDepenseModal(false)
    fetchData(mois.id)
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
        {/* Navigation mois */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={() => setCurrentIdx(i => Math.min(i + 1, moisList.length - 1))}
            disabled={currentIdx >= moisList.length - 1}
            style={{ background: 'none', border: 'none', color: currentIdx >= moisList.length - 1 ? '#1a1a3a' : '#3a7bd5', fontSize: 22, cursor: 'pointer', padding: '8px' }}
          >←</button>
          <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>
            {mois ? getMoisLabel(mois.mois) : 'Aucun mois'}
          </div>
          <button
            onClick={() => setCurrentIdx(i => Math.max(i - 1, 0))}
            disabled={currentIdx <= 0}
            style={{ background: 'none', border: 'none', color: currentIdx <= 0 ? '#1a1a3a' : '#3a7bd5', fontSize: 22, cursor: 'pointer', padding: '8px' }}
          >→</button>
        </div>

        {!mois ? (
          <div style={{ background: '#0c0c24', border: '1px dashed #1a1a3a', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ color: '#c8e0ff', fontWeight: 700, marginBottom: 8 }}>Aucun mois créé</div>
            <div style={{ color: '#3a5080', fontSize: 13, marginBottom: 16 }}>Crée ton premier mois financier pour commencer</div>
            <button
              onClick={() => navigate('/finance/mois')}
              style={{ background: '#3a7bd5', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Créer un mois
            </button>
          </div>
        ) : (
          <>
            {/* === CARTE DOUBLE SOLDE === */}
            <div style={{
              background: '#0c0c24',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 16,
            }}>
              {/* Bloc 1 : Sur le compte maintenant */}
              <div style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: soldeSurCompte >= 0 ? 'rgba(42,154,90,0.05)' : 'rgba(160,74,74,0.05)',
              }}>
                <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                  💳 Sur mon compte maintenant
                </div>
                <div style={{ color: soldeSurCompte >= 0 ? '#2a9a5a' : '#a04a4a', fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
                  {soldeSurCompte >= 0 ? '+' : ''}{fmt(soldeSurCompte)} €
                </div>
                {isCurrentMonth && facturesAVenir > 0 && (
                  <div style={{ color: '#3a5080', fontSize: 12, marginTop: 4 }}>
                    {fmt(facturesAVenir)} € de factures encore à venir
                  </div>
                )}
              </div>

              {/* Bloc 2 : Après toutes les factures */}
              <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                  🔮 Après toutes les factures
                </div>
                <div style={{ color: soldeApresFactures >= 0 ? '#c8e0ff' : '#a04a4a', fontSize: 24, fontWeight: 700 }}>
                  {soldeApresFactures >= 0 ? '+' : ''}{fmt(soldeApresFactures)} €
                </div>
                {totalVersements > 0 && (
                  <div style={{ color: '#3a5080', fontSize: 12, marginTop: 4 }}>
                    Après versements : {soldeFinal >= 0 ? '+' : ''}{fmt(soldeFinal)} €
                  </div>
                )}
              </div>
            </div>

            {/* Grille 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Revenus', value: totalRevenus, color: '#2a9a5a', emoji: '💶' },
                { label: 'Factures', value: totalFactures, color: '#f0c040', emoji: '🧾' },
                { label: 'Dépenses', value: totalDepenses, color: '#a04a4a', emoji: '🛒' },
                { label: 'Versements', value: totalVersements, color: '#3a7bd5', emoji: '💰' },
              ].map(item => (
                <div key={item.label} style={{
                  background: '#0c0c24',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '16px 14px',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{item.emoji}</div>
                  <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: item.color, fontWeight: 700, fontSize: 16 }}>{fmt(item.value)} €</div>
                </div>
              ))}
            </div>

            {/* Graphique dépenses par catégorie */}
            {depParCategorie.length > 0 && (
              <div style={{
                background: '#0c0c24',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px 14px',
                marginBottom: 20,
              }}>
                <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
                  Dépenses par catégorie
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={depParCategorie} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <XAxis type="number" hide />
                    <Tooltip
                      formatter={(v) => [`${fmt(v)} €`]}
                      contentStyle={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 8 }}
                      labelStyle={{ color: '#8bb8f0', fontSize: 11 }}
                      itemStyle={{ color: '#c8e0ff', fontSize: 12 }}
                    />
                    <Bar dataKey="montant" radius={[0, 4, 4, 0]}>
                      {depParCategorie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB + Dépense */}
      {mois && (
        <button
          onClick={() => setShowDepenseModal(true)}
          style={{
            position: 'fixed', bottom: 80, right: 20,
            width: 52, height: 52, borderRadius: '50%',
            background: '#3a7bd5', border: 'none', color: '#fff',
            fontSize: 24, cursor: 'pointer', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(58,123,213,0.4)',
          }}
        >+</button>
      )}

      {/* Modal dépense rapide */}
      {showDepenseModal && (
        <div
          onClick={() => setShowDepenseModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0c0c24', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 430 }}
          >
            <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>+ Dépense rapide</div>
            <input
              placeholder="Description"
              value={newDep.label}
              onChange={e => setNewDep(d => ({ ...d, label: e.target.value }))}
              style={{ width: '100%', background: '#060611', border: '1px solid #1a1a3a', borderRadius: 8, padding: '10px 12px', color: '#c8e0ff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
            />
            <input
              placeholder="Montant (€)"
              type="number"
              value={newDep.montant}
              onChange={e => setNewDep(d => ({ ...d, montant: e.target.value }))}
              style={{ width: '100%', background: '#060611', border: '1px solid #1a1a3a', borderRadius: 8, padding: '10px 12px', color: '#c8e0ff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
            />
            <select
              value={newDep.categorie}
              onChange={e => setNewDep(d => ({ ...d, categorie: e.target.value }))}
              style={{ width: '100%', background: '#060611', border: '1px solid #1a1a3a', borderRadius: 8, padding: '10px 12px', color: '#c8e0ff', fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }}
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDepenseModal(false)} style={{ flex: 1, background: '#1a1a3a', border: 'none', borderRadius: 8, padding: '12px', color: '#3a5080', fontSize: 14, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={ajouterDepense} style={{ flex: 2, background: '#3a7bd5', border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
