import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const today = () => new Date().toISOString().split('T')[0]

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function Modal({ onClose, onSaved }) {
  const [date, setDate] = useState(today())
  const [montant, setMontant] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('injections').insert({
      user_id: user.id,
      date,
      montant: Number(montant),
      note: note.trim() || null,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const inputClass = 'bg-bg-primary border border-border rounded-input px-4 py-3 text-text-primary text-sm outline-none focus:border-accent transition-colors w-full'
  const labelClass = 'text-text-muted text-[10px] uppercase tracking-[2px] font-medium'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-bg-card border border-border rounded-t-[20px] w-full max-w-[430px] p-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-bold text-base">Nouvelle injection</h2>
          <button onClick={onClose} className="text-text-muted text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Montant (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              required
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ex: virement mensuel"
              className={inputClass}
            />
          </div>

          {error && <p className="text-loss text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white rounded-input py-3 text-sm font-semibold disabled:opacity-50 mt-2"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Injections() {
  const [injections, setInjections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchInjections() {
    setLoading(true)
    const { data } = await supabase.from('injections').select('*').order('date', { ascending: false })
    setInjections(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchInjections() }, [])

  const total = injections.reduce((s, i) => s + Number(i.montant), 0)

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <p className="text-text-muted text-[10px] uppercase tracking-[2px]">Mon PEA</p>
        <h1 className="text-text-primary text-lg font-bold mt-0.5">Injections de capital</h1>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-3 px-5 pb-32">
        {loading ? (
          <p className="text-text-muted text-sm">Chargement…</p>
        ) : injections.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-card p-5">
            <p className="text-text-muted text-sm">Aucune injection enregistrée</p>
          </div>
        ) : (
          <>
            {injections.map((inj) => (
              <div key={inj.id} className="bg-bg-card border border-border rounded-card px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-text-primary font-bold">{fmt(inj.montant)}</p>
                  {inj.note && <p className="text-text-muted text-xs mt-0.5">{inj.note}</p>}
                </div>
                <p className="text-text-muted text-xs">{new Date(inj.date).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}

            {/* Total */}
            <div className="bg-bg-card border border-border rounded-card px-4 py-3 flex items-center justify-between mt-1">
              <p className="text-text-muted text-[10px] uppercase tracking-[2px] font-medium">Total injecté</p>
              <p className="text-text-primary font-bold text-base">{fmt(total)}</p>
            </div>
          </>
        )}
      </div>

      {/* Bouton + flottant */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl z-40"
        style={{ backgroundColor: '#3a7bd5' }}
      >
        +
      </button>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchInjections() }}
        />
      )}

      <BottomNav />
    </div>
  )
}
