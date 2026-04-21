import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const INPUT = 'w-full rounded-input px-3 py-3 text-text-primary text-sm outline-none transition-colors bg-bg-input'
const LABEL = 'font-mono uppercase text-[9px] tracking-[2px] text-text-muted'

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
      user_id: user.id, date, montant: Number(montant), note: note.trim() || null,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-card p-6" style={{ backgroundColor: '#0c0c24', ...B }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-black text-base">Nouvelle injection</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Montant (€)</label>
            <input type="number" step="0.01" min="0" value={montant} onChange={e => setMontant(e.target.value)} required placeholder="0.00" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Note (optionnel)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="ex: virement mensuel" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
          </div>
          {error && <p className="text-loss text-xs text-center">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-input py-3 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#3a7bd5' }}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
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
    <PageWrapper>
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-5 md:px-8 pt-10 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Mon PEA</p>
            <h1 className="text-text-primary font-black text-xl tracking-tight mt-0.5">Injections de capital</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="hidden md:flex items-center gap-2 rounded-input px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: '#3a7bd5' }}>
            <span className="text-lg leading-none">+</span> Ajouter
          </button>
        </div>

        {/* Carte total — desktop en haut, mobile en bas de liste */}
        {!loading && injections.length > 0 && (
          <div className="hidden md:flex items-center justify-between rounded-card px-5 py-4 mb-6" style={{ backgroundColor: '#0c0c24', ...B }}>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Total injecté</p>
            <p className="text-text-primary font-black text-xl tracking-tight">{fmt(total)}</p>
          </div>
        )}

        {/* Mobile : liste cartes */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : injections.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucune injection enregistrée</p>
            </div>
          ) : (
            <>
              {injections.map(inj => (
                <div key={inj.id} className="rounded-card px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#0c0c24', ...B }}>
                  <div>
                    <p className="text-text-primary font-bold">{fmt(inj.montant)}</p>
                    {inj.note && <p className="text-text-muted text-xs mt-0.5">{inj.note}</p>}
                  </div>
                  <p className="text-text-muted text-xs font-mono">{new Date(inj.date).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
              <div className="rounded-card px-4 py-3 flex items-center justify-between mt-1" style={{ backgroundColor: '#0c0c24', ...B }}>
                <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Total injecté</p>
                <p className="text-text-primary font-black text-base">{fmt(total)}</p>
              </div>
            </>
          )}
        </div>

        {/* Desktop : tableau */}
        <div className="hidden md:block">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : injections.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucune injection enregistrée</p>
            </div>
          ) : (
            <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#0c0c24', ...B }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Montant', 'Note'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-mono text-[9px] uppercase tracking-[2px] text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {injections.map((inj, i) => (
                    <tr key={inj.id} style={{ borderBottom: i < injections.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td className="px-5 py-3 text-text-muted font-mono text-xs">{new Date(inj.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-3 text-text-primary font-bold">{fmt(inj.montant)}</td>
                      <td className="px-5 py-3 text-text-muted text-xs">{inj.note || '—'}</td>
                    </tr>
                  ))}
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

      {showModal && <Modal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchInjections() }} />}
    </PageWrapper>
  )
}
