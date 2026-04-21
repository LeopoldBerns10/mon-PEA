import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const today = () => new Date().toISOString().split('T')[0]

function fmt(val, dec = 2) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

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
      setError(`Maximum ${fmt(position.restantes, 4)} parts disponibles pour ${indice}.`)
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('ventes').insert({
      user_id: user.id,
      date,
      indice,
      nb_parts: Number(nbParts),
      prix_vente: Number(prixVente),
      frais: Number(frais || 0),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const inputClass = 'bg-bg-primary border border-border rounded-input px-4 py-3 text-text-primary text-sm outline-none focus:border-accent transition-colors w-full'
  const labelClass = 'text-text-muted text-[10px] uppercase tracking-[2px] font-medium'
  const gainColor = gainPerte !== null ? (gainPerte >= 0 ? '#4a9a6a' : '#a04a4a') : '#e8f0ff'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-bg-card border border-border rounded-t-[20px] w-full max-w-[430px] p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-bold text-base">Nouvelle vente</h2>
          <button onClick={onClose} className="text-text-muted text-xl leading-none">✕</button>
        </div>

        {positions.length === 0 ? (
          <p className="text-text-muted text-sm">Aucune position ouverte à vendre.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Indice</label>
              <select value={indice} onChange={e => setIndice(e.target.value)} required className={inputClass}>
                {positions.map(p => (
                  <option key={p.indice} value={p.indice}>
                    {p.indice} — {fmt(p.restantes, 4)} parts dispo
                  </option>
                ))}
              </select>
            </div>

            {position && (
              <div className="bg-bg-primary border border-border rounded-input px-4 py-2">
                <p className="text-text-muted text-[10px] uppercase tracking-widest">PRU moyen d'achat</p>
                <p className="text-text-primary text-sm font-semibold">{fmt(position.pruMoyen, 4)} €</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Nombre de parts</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max={position?.restantes}
                  value={nbParts}
                  onChange={e => setNbParts(e.target.value)}
                  required
                  placeholder="0.0000"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Prix de vente (€)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={prixVente}
                  onChange={e => setPrixVente(e.target.value)}
                  required
                  placeholder="0.0000"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Frais (€)</label>
              <input type="number" step="0.01" min="0" value={frais} onChange={e => setFrais(e.target.value)} className={inputClass} />
            </div>

            {/* Calculs auto */}
            {montantRecupere !== null && (
              <div className="bg-bg-primary border border-border rounded-input px-4 py-3 flex flex-col gap-2">
                <div className="flex justify-between">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest">Montant récupéré</p>
                  <p className="text-text-primary font-semibold text-sm">{fmt(montantRecupere)} €</p>
                </div>
                {gainPerte !== null && (
                  <div className="flex justify-between">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest">Gain / Perte</p>
                    <p className="font-bold text-sm" style={{ color: gainColor }}>
                      {gainPerte >= 0 ? '+' : ''}{fmt(gainPerte)} € ({gainPct >= 0 ? '+' : ''}{fmt(gainPct)} %)
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-loss text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-white rounded-input py-3 text-sm font-semibold disabled:opacity-50 mt-2"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer la vente'}
            </button>
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

    // Calcul positions ouvertes pour le formulaire
    const partsAchetees = {}
    const coutTotal = {}
    ;(ordres || []).forEach(o => {
      partsAchetees[o.indice] = (partsAchetees[o.indice] || 0) + Number(o.nb_parts)
      coutTotal[o.indice] = (coutTotal[o.indice] || 0) + Number(o.nb_parts) * Number(o.pru)
    })
    const partsVendues = {}
    ;(ventesPos || []).forEach(v => {
      partsVendues[v.indice] = (partsVendues[v.indice] || 0) + Number(v.nb_parts)
    })
    const pos = Object.keys(partsAchetees)
      .map(indice => ({
        indice,
        restantes: partsAchetees[indice] - (partsVendues[indice] || 0),
        pruMoyen: coutTotal[indice] / partsAchetees[indice],
      }))
      .filter(p => p.restantes > 0.0001)

    setPositions(pos)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <p className="text-text-muted text-[10px] uppercase tracking-[2px]">Mon PEA</p>
        <h1 className="text-text-primary text-lg font-bold mt-0.5">Mes ventes</h1>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-3 px-5 pb-32">
        {loading ? (
          <p className="text-text-muted text-sm">Chargement…</p>
        ) : ventes.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-card p-5">
            <p className="text-text-muted text-sm">Aucune vente enregistrée</p>
          </div>
        ) : (
          ventes.map((v) => {
            const pos = positions.find(p => p.indice === v.indice)
            const produit = Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais)
            const pruMoyen = pos?.pruMoyen ?? null
            const coutAchat = pruMoyen !== null ? Number(v.nb_parts) * pruMoyen : null
            const gain = coutAchat !== null ? produit - coutAchat : null
            const gainPct = gain !== null && coutAchat > 0 ? (gain / coutAchat) * 100 : null
            const gainColor = gain !== null ? (gain >= 0 ? '#4a9a6a' : '#a04a4a') : '#e8f0ff'

            return (
              <div key={v.id} className="bg-bg-card border border-border rounded-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-accent font-bold text-sm">{v.indice}</span>
                  <span className="text-text-muted text-xs">{new Date(v.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-text-muted text-[10px] uppercase tracking-widest">Parts vendues</p>
                    <p className="text-text-primary text-sm font-medium">{fmt(v.nb_parts, 4)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-[10px] uppercase tracking-widest">Prix de vente</p>
                    <p className="text-text-primary text-sm font-medium">{fmt(v.prix_vente, 4)} €</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-[10px] uppercase tracking-widest">Frais</p>
                    <p className="text-text-primary text-sm font-medium">{fmt(v.frais)} €</p>
                  </div>
                  {gain !== null && (
                    <div>
                      <p className="text-text-muted text-[10px] uppercase tracking-widest">Gain / Perte</p>
                      <p className="text-sm font-bold" style={{ color: gainColor }}>
                        {gain >= 0 ? '+' : ''}{fmt(gain)} €
                        {gainPct !== null && <span className="text-xs ml-1">({gainPct >= 0 ? '+' : ''}{fmt(gainPct)} %)</span>}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bouton + flottant */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-end pr-5 pointer-events-none z-40">
        <button
          onClick={() => setShowModal(true)}
          className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl"
          style={{ backgroundColor: '#3a7bd5' }}
        >
          +
        </button>
      </div>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
          positions={positions}
        />
      )}

      <BottomNav />
    </div>
  )
}
