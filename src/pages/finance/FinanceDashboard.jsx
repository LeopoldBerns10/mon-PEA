import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/PageWrapper'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const CATEGORIES = [
  { id: 'nourriture',             label: 'Nourriture',               emoji: '🛒', color: '#3a7bd5' },
  { id: 'essence',                label: 'Essence',                  emoji: '⛽', color: '#f0c040' },
  { id: 'loisirs',                label: 'Loisirs',                  emoji: '🎮', color: '#8b5cf6' },
  { id: 'restaurant',             label: 'Restaurant',               emoji: '🍔', color: '#f97316' },
  { id: 'sante',                  label: 'Santé',                    emoji: '💊', color: '#2a9a5a' },
  { id: 'vetements',              label: 'Vêtements',                emoji: '👕', color: '#ec4899' },
  { id: 'transport',              label: 'Transport',                emoji: '🚗', color: '#06b6d4' },
  { id: 'complement_alimentaire', label: 'Compléments alimentaires', emoji: '💪', color: '#84cc16' },
  { id: 'jeux_video',             label: 'Jeux Vidéo',               emoji: '🕹️', color: '#a855f7' },
  { id: 'sortie_bar',             label: 'Sorties Bar',              emoji: '🍺', color: '#f59e0b' },
  { id: 'cigarette',              label: 'Cigarette électronique',   emoji: '💨', color: '#64748b' },
  { id: 'autre',                  label: 'Autre',                    emoji: '📦', color: '#3a5080' },
]

const INPUT_STYLE = {
  width: '100%',
  background: '#060611',
  border: '1px solid #1a1a3a',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#c8e0ff',
  fontSize: 14,
  boxSizing: 'border-box',
}

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
  const [quickDep, setQuickDep] = useState({ label: '', montant: '', categorie: 'nourriture' })
  const [saving, setSaving] = useState(false)

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

  async function ajouterDepenseRapide() {
    if (!quickDep.label || !quickDep.montant || !mois || mois.cloture) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('depenses').insert({
      user_id: user.id,
      mois_id: mois.id,
      label: quickDep.label,
      montant: parseFloat(quickDep.montant),
      categorie: quickDep.categorie,
      date: new Date().toISOString().split('T')[0],
    })
    setQuickDep({ label: '', montant: '', categorie: 'nourriture' })
    setSaving(false)
    fetchData(mois.id)
  }

  const mois = moisList[currentIdx]
  const today = new Date()

  const totalRevenus = data.revenus.reduce((s, r) => s + Number(r.montant), 0)
  const totalFactures = data.factures.reduce((s, f) => s + Number(f.montant_reel ?? f.montant_prevu ?? 0), 0)
  const totalDepenses = data.depenses.reduce((s, d) => s + Number(d.montant), 0)
  const totalVersements = data.versements.reduce((s, v) => s + Number(v.montant), 0)

  const facturesPayees = data.factures.reduce((s, f) =>
    f.paye ? s + Number(f.montant_reel ?? f.montant_prevu ?? 0) : s, 0)
  const facturesNonPayees = totalFactures - facturesPayees
  const soldeActuel = totalRevenus - facturesPayees - totalDepenses - totalVersements
  const soldeFinalEstime = soldeActuel - facturesNonPayees

  const depensesParCategorie = CATEGORIES
    .map(cat => ({
      name: cat.label,
      emoji: cat.emoji,
      value: data.depenses.filter(d => d.categorie === cat.id).reduce((sum, d) => sum + Number(d.montant), 0),
      color: cat.color,
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalDepCat = depensesParCategorie.reduce((s, d) => s + d.value, 0)

  const moisActif = mois && !mois.cloture

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
            {/* === CARTE SOLDE === */}
            <div style={{
              background: '#0c0c24',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '20px',
              marginBottom: 16,
            }}>
              <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                💳 Solde actuel
              </div>
              <div style={{ color: soldeActuel >= 0 ? '#2a9a5a' : '#a04a4a', fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
                {soldeActuel >= 0 ? '+' : ''}{fmt(soldeActuel)} €
              </div>
              {facturesNonPayees > 0 && (
                <div style={{ color: '#f0c040', fontSize: 13, marginTop: 10 }}>
                  Dont encore à prélever : -{fmt(facturesNonPayees)} €
                </div>
              )}
              {facturesNonPayees > 0 && (
                <div style={{ color: soldeFinalEstime >= 0 ? '#2a9a5a' : '#a04a4a', fontSize: 17, fontWeight: 700, marginTop: 4 }}>
                  Solde final estimé : {soldeFinalEstime >= 0 ? '+' : ''}{fmt(soldeFinalEstime)} €
                </div>
              )}
            </div>

            {/* === SAISIE RAPIDE DÉPENSE === */}
            {moisActif ? (
              <div style={{
                background: '#0c0c24',
                border: '1px solid #1a1a3a',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}>
                <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
                  + Ajouter une dépense rapidement
                </div>
                <input
                  placeholder="Description"
                  value={quickDep.label}
                  onChange={e => setQuickDep(d => ({ ...d, label: e.target.value }))}
                  style={{ ...INPUT_STYLE, marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="Montant €"
                    type="number"
                    value={quickDep.montant}
                    onChange={e => setQuickDep(d => ({ ...d, montant: e.target.value }))}
                    style={{ ...INPUT_STYLE, flex: 1 }}
                  />
                  <select
                    value={quickDep.categorie}
                    onChange={e => setQuickDep(d => ({ ...d, categorie: e.target.value }))}
                    style={{ ...INPUT_STYLE, flex: 2 }}
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <button
                  onClick={ajouterDepenseRapide}
                  disabled={saving || !quickDep.label || !quickDep.montant}
                  style={{
                    width: '100%',
                    background: '#3a7bd5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    marginTop: 8,
                    opacity: (saving || !quickDep.label || !quickDep.montant) ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            ) : (
              <div style={{
                background: '#0c0c24',
                border: '1px solid #1a1a3a',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: '#3a5080', fontSize: 13 }}>Mois clôturé — pas de saisie possible</span>
                <button
                  onClick={() => navigate('/finance/mois')}
                  style={{ background: 'transparent', border: '1px solid #3a7bd5', color: '#3a7bd5', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Gérer les mois →
                </button>
              </div>
            )}

            {/* Grille 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Revenus',    value: totalRevenus,    color: '#2a9a5a', emoji: '💶' },
                { label: 'Factures',   value: totalFactures,   color: '#f0c040', emoji: '🧾' },
                { label: 'Dépenses',   value: totalDepenses,   color: '#a04a4a', emoji: '🛒' },
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

            {/* === DONUT DÉPENSES PAR CATÉGORIE === */}
            {depensesParCategorie.length > 0 && (
              <div style={{
                background: '#0c0c24',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px 14px',
                marginBottom: 20,
              }}>
                <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
                  Répartition des dépenses
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={depensesParCategorie}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {depensesParCategorie.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value.toFixed(2)} €`]}
                      contentStyle={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: '8px', color: '#c8e0ff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Légende custom */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {depensesParCategorie.map((item, i) => {
                    const pct = totalDepCat > 0 ? Math.round((item.value / totalDepCat) * 100) : 0
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ color: '#c8e0ff', fontSize: 13, flex: 1 }}>{item.emoji} {item.name}</span>
                        <span style={{ color: '#c8e0ff', fontSize: 13, fontWeight: 600 }}>{fmt(item.value)} €</span>
                        <span style={{ color: '#3a5080', fontSize: 12, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
