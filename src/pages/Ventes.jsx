import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const BADGE = { background: '#0d2040', border: '1px solid #1e3a6e', color: '#f0c040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const INPUT = 'w-full rounded-input px-3 py-3 text-text-primary text-sm outline-none transition-colors bg-bg-input'
const LABEL = 'font-mono uppercase text-[9px] tracking-[2px] text-text-muted'

const today = () => new Date().toISOString().split('T')[0]

function fmt(val, dec = 2) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function gainColor(val) { return val >= 0 ? '#2a9a5a' : '#a04a4a' }

function Modal({ onClose, onSaved, positions }) {
  const [date, setDate] = useState(today())
  const [indice, setIndice] = useState(positions[0]?.indice || '')
  const [nbParts, setNbParts] = useState('')
  const [prixVente, setPrixVente] = useState('')
  const [frais, setFrais] = useState('1.89')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const position = positions.find(p => p.indice === indice)
  const montantRecupere = nbParts && prixVente ? Number(nbParts) * Number(prixVente) - Number(frais || 0) : null
  const coutAchat = nbParts && position ? Number(nbParts) * position.pruMoyen : null
  const gainPerte = montantRecupere !== null && coutAchat !== null ? montantRecupere - coutAchat : null
  const gainPct = gainPerte !== null && coutAchat > 0 ? (gainPerte / coutAchat) * 100 : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (position && Number(nbParts) > position.restantes) {
      setError(`Maximum ${fmt(position.restantes, 4)} parts disponibles.`)
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('ventes').insert({
      user_id: user.id, date, indice,
      nb_parts: Number(nbParts), prix_vente: Number(prixVente), frais: Number(frais || 0),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-card p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#0c0c24', ...B }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-black text-base">Nouvelle vente</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">✕</button>
        </div>

        {positions.length === 0 ? (
          <p className="text-text-muted text-sm">Aucune position ouverte à vendre.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Indice</label>
              <select value={indice} onChange={e => setIndice(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }}>
                {positions.map(p => (
                  <option key={p.indice} value={p.indice}>{p.indice} — {fmt(p.restantes, 4)} parts dispo</option>
                ))}
              </select>
            </div>
            {position && (
              <div className="rounded-input px-4 py-2.5" style={{ backgroundColor: '#07071a', ...B }}>
                <p className={LABEL}>PRU moyen d'achat</p>
                <p className="text-text-primary font-bold text-sm mt-1">{fmt(position.pruMoyen, 4)} €</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Nombre de parts</label>
                <input type="number" step="0.0001" min="0" max={position?.restantes} value={nbParts} onChange={e => setNbParts(e.target.value)} required placeholder="0.0000" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Prix de vente (€)</label>
                <input type="number" step="0.0001" min="0" value={prixVente} onChange={e => setPrixVente(e.target.value)} required placeholder="0.0000" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Frais (€)</label>
              <input type="number" step="0.01" min="0" value={frais} onChange={e => setFrais(e.target.value)} className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>

            {montantRecupere !== null && (
              <div className="rounded-input px-4 py-3 flex flex-col gap-2" style={{ backgroundColor: '#07071a', ...B }}>
                <div className="flex justify-between">
                  <p className={LABEL}>Montant récupéré</p>
                  <p className="text-text-primary font-bold text-sm">{fmt(montantRecupere)} €</p>
                </div>
                {gainPerte !== null && (
                  <div className="flex justify-between">
                    <p className={LABEL}>Gain / Perte</p>
                    <p className="font-bold text-sm" style={{ color: gainColor(gainPerte) }}>
                      {gainPerte >= 0 ? '+' : ''}{fmt(gainPerte)} € ({gainPct >= 0 ? '+' : ''}{fmt(gainPct)} %)
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-loss text-xs text-center">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>Annuler</button>
              <button type="submit" disabled={loading} className="flex-1 rounded-input py-3 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#3a7bd5' }}>
                {loading ? 'Enregistrement…' : 'Enregistrer la vente'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Ventes() {
  const [ventes, setVentes] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchData() {
    setLoading(true)
    const [{ data: ventesData }, { data: ordres }, { data: ventesPos }] = await Promise.all([
      supabase.from('ventes').select('*').order('date', { ascending: false }),
      supabase.from('ordres').select('indice, nb_parts, pru'),
      supabase.from('ventes').select('indice, nb_parts'),
    ])
    setVentes(ventesData || [])

    const partsAchetees = {}, coutTotal = {}
    ;(ordres || []).forEach(o => {
      partsAchetees[o.indice] = (partsAchetees[o.indice] || 0) + Number(o.nb_parts)
      coutTotal[o.indice] = (coutTotal[o.indice] || 0) + Number(o.nb_parts) * Number(o.pru)
    })
    const partsVendues = {}
    ;(ventesPos || []).forEach(v => { partsVendues[v.indice] = (partsVendues[v.indice] || 0) + Number(v.nb_parts) })

    setPositions(
      Object.keys(partsAchetees)
        .map(indice => ({
          indice,
          restantes: partsAchetees[indice] - (partsVendues[indice] || 0),
          pruMoyen: coutTotal[indice] / partsAchetees[indice],
        }))
        .filter(p => p.restantes > 0.0001)
    )
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function ventePRU(v) {
    const pos = positions.find(p => p.indice === v.indice)
    return pos?.pruMoyen ?? null
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-5 md:px-8 pt-10 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Mon PEA</p>
            <h1 className="text-text-primary font-black text-xl tracking-tight mt-0.5">Mes ventes</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="hidden md:flex items-center gap-2 rounded-input px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: '#3a7bd5' }}>
            <span className="text-lg leading-none">+</span> Ajouter une vente
          </button>
        </div>

        {/* Mobile : cartes */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : ventes.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucune vente enregistrée</p>
            </div>
          ) : ventes.map(v => {
            const pru = ventePRU(v)
            const produit = Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais)
            const cout = pru !== null ? Number(v.nb_parts) * pru : null
            const gain = cout !== null ? produit - cout : null
            const pct = gain !== null && cout > 0 ? (gain / cout) * 100 : null
            return (
              <div key={v.id} className="rounded-card p-4" style={{ backgroundColor: '#0c0c24', ...B }}>
                <div className="flex items-center justify-between mb-3">
                  <span style={BADGE}>{v.indice}</span>
                  <span className="text-text-muted text-xs font-mono">{new Date(v.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[['Parts vendues', fmt(v.nb_parts, 4)], ['Prix de vente', fmt(v.prix_vente, 4) + ' €'], ['Frais', fmt(v.frais) + ' €']].map(([l, val]) => (
                    <div key={l}>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">{l}</p>
                      <p className="text-text-primary text-sm font-bold mt-0.5">{val}</p>
                    </div>
                  ))}
                  {gain !== null && (
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Gain / Perte</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: gainColor(gain) }}>
                        {gain >= 0 ? '+' : ''}{fmt(gain)} €{pct !== null && <span className="text-xs ml-1">({pct >= 0 ? '+' : ''}{fmt(pct)} %)</span>}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop : tableau */}
        <div className="hidden md:block">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : ventes.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucune vente enregistrée</p>
            </div>
          ) : (
            <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#0c0c24', ...B }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Indice', 'Parts', 'Prix vente', 'Frais', 'Montant récupéré', 'Gain €', 'Gain %'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-mono text-[9px] uppercase tracking-[2px] text-text-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventes.map((v, i) => {
                    const pru = ventePRU(v)
                    const produit = Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais)
                    const cout = pru !== null ? Number(v.nb_parts) * pru : null
                    const gain = cout !== null ? produit - cout : null
                    const pct = gain !== null && cout > 0 ? (gain / cout) * 100 : null
                    return (
                      <tr key={v.id} style={{ borderBottom: i < ventes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <td className="px-4 py-3 text-text-muted font-mono text-xs">{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3"><span style={BADGE}>{v.indice}</span></td>
                        <td className="px-4 py-3 text-text-primary">{fmt(v.nb_parts, 4)}</td>
                        <td className="px-4 py-3 text-text-primary">{fmt(v.prix_vente, 4)} €</td>
                        <td className="px-4 py-3 text-text-muted">{fmt(v.frais)} €</td>
                        <td className="px-4 py-3 text-text-primary font-bold">{fmt(produit)} €</td>
                        <td className="px-4 py-3 font-bold" style={{ color: gain !== null ? gainColor(gain) : '#3a5080' }}>
                          {gain !== null ? (gain >= 0 ? '+' : '') + fmt(gain) + ' €' : '—'}
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color: pct !== null ? gainColor(pct) : '#3a5080' }}>
                          {pct !== null ? (pct >= 0 ? '+' : '') + fmt(pct) + ' %' : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bouton + mobile flottant */}
      <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-end pr-5 pointer-events-none z-40">
        <button onClick={() => setShowModal(true)} className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl" style={{ backgroundColor: '#3a7bd5' }}>+</button>
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchData() }} positions={positions} />}
    </PageWrapper>
  )
}
