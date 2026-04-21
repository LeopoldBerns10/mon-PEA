import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const today = () => new Date().toISOString().split('T')[0]

function fmt(val, dec = 2) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function Modal({ onClose, onSaved }) {
  const [date, setDate] = useState(today())
  const [indice, setIndice] = useState('')
  const [nbParts, setNbParts] = useState('')
  const [pru, setPru] = useState('')
  const [frais, setFrais] = useState('1.89')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const prixTTC = nbParts && pru ? Number(nbParts) * Number(pru) + Number(frais || 0) : null
  const pruTTC = prixTTC && nbParts ? prixTTC / Number(nbParts) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('ordres').insert({
      user_id: user.id,
      date,
      indice: indice.trim().toUpperCase(),
      nb_parts: Number(nbParts),
      pru: Number(pru),
      frais: Number(frais || 0),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const inputClass = 'bg-bg-primary border border-border rounded-input px-4 py-3 text-text-primary text-sm outline-none focus:border-accent transition-colors w-full'
  const labelClass = 'text-text-muted text-[10px] uppercase tracking-[2px] font-medium'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-bg-card border border-border rounded-t-[20px] w-full max-w-[430px] p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-bold text-base">Nouvel ordre</h2>
          <button onClick={onClose} className="text-text-muted text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Indice</label>
            <input type="text" value={indice} onChange={e => setIndice(e.target.value)} required placeholder="ex: DCAM, WPEA" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nombre de parts</label>
              <input type="number" step="0.0001" min="0" value={nbParts} onChange={e => setNbParts(e.target.value)} required placeholder="0.0000" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>PRU (€)</label>
              <input type="number" step="0.0001" min="0" value={pru} onChange={e => setPru(e.target.value)} required placeholder="0.0000" className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Frais (€)</label>
            <input type="number" step="0.01" min="0" value={frais} onChange={e => setFrais(e.target.value)} className={inputClass} />
          </div>

          {/* Calculs auto */}
          {prixTTC !== null && (
            <div className="bg-bg-primary border border-border rounded-input px-4 py-3 flex justify-between">
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">Prix TTC</p>
                <p className="text-text-primary font-bold">{fmt(prixTTC)} €</p>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">PRU TTC</p>
                <p className="text-text-primary font-bold">{fmt(pruTTC, 4)} €</p>
              </div>
            </div>
          )}

          {error && <p className="text-loss text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white rounded-input py-3 text-sm font-semibold disabled:opacity-50 mt-2"
          >
            {loading ? 'Enregistrement…' : "Enregistrer l'ordre"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Ordres() {
  const [ordres, setOrdres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchOrdres() {
    setLoading(true)
    const { data } = await supabase.from('ordres').select('*').order('date', { ascending: false })
    setOrdres(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrdres() }, [])

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <p className="text-text-muted text-[10px] uppercase tracking-[2px]">Mon PEA</p>
        <h1 className="text-text-primary text-lg font-bold mt-0.5">Mes ordres</h1>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-3 px-5 pb-32">
        {loading ? (
          <p className="text-text-muted text-sm">Chargement…</p>
        ) : ordres.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-card p-5">
            <p className="text-text-muted text-sm">Aucun ordre enregistré</p>
          </div>
        ) : (
          ordres.map((o) => (
            <div key={o.id} className="bg-bg-card border border-border rounded-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-accent font-bold text-sm">{o.indice}</span>
                <span className="text-text-muted text-xs">{new Date(o.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-widest">Parts</p>
                  <p className="text-text-primary text-sm font-medium">{fmt(o.nb_parts, 4)}</p>
                </div>
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-widest">PRU</p>
                  <p className="text-text-primary text-sm font-medium">{fmt(o.pru, 4)} €</p>
                </div>
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-widest">Frais</p>
                  <p className="text-text-primary text-sm font-medium">{fmt(o.frais)} €</p>
                </div>
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-widest">Prix TTC</p>
                  <p className="text-text-primary text-sm font-bold">{fmt(o.prix_ttc)} €</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bouton + flottant */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl z-40 shadow-none"
        style={{ backgroundColor: '#3a7bd5' }}
      >
        +
      </button>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchOrdres() }}
        />
      )}

      <BottomNav />
    </div>
  )
}
