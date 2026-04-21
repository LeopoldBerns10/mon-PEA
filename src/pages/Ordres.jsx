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
      user_id: user.id, date,
      indice: indice.trim().toUpperCase(),
      nb_parts: Number(nbParts), pru: Number(pru), frais: Number(frais || 0),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-card p-6" style={{ backgroundColor: '#0c0c24', ...B }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-black text-base">Nouvel ordre</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className={LABEL}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className={LABEL}>Indice</label>
              <input type="text" value={indice} onChange={e => setIndice(e.target.value)} required placeholder="ex: DCAM, WPEA" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Nombre de parts</label>
              <input type="number" step="0.0001" min="0" value={nbParts} onChange={e => setNbParts(e.target.value)} required placeholder="0.0000" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>PRU (€)</label>
              <input type="number" step="0.0001" min="0" value={pru} onChange={e => setPru(e.target.value)} required placeholder="0.0000" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className={LABEL}>Frais (€)</label>
              <input type="number" step="0.01" min="0" value={frais} onChange={e => setFrais(e.target.value)} className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
          </div>

          {prixTTC !== null && (
            <div className="rounded-input px-4 py-3 flex justify-between" style={{ backgroundColor: '#07071a', ...B }}>
              <div>
                <p className={LABEL}>Prix TTC</p>
                <p className="text-text-primary font-bold mt-1">{fmt(prixTTC)} €</p>
              </div>
              <div className="text-right">
                <p className={LABEL}>PRU TTC</p>
                <p className="text-text-primary font-bold mt-1">{fmt(pruTTC, 4)} €</p>
              </div>
            </div>
          )}

          {error && <p className="text-loss text-xs text-center">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-input py-3 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#3a7bd5' }}>
              {loading ? 'Enregistrement…' : "Enregistrer l'ordre"}
            </button>
          </div>
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
    <PageWrapper>
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-5 md:px-8 pt-10 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Mon PEA</p>
            <h1 className="text-text-primary font-black text-xl tracking-tight mt-0.5">Mes ordres</h1>
          </div>
          {/* Bouton desktop */}
          <button onClick={() => setShowModal(true)} className="hidden md:flex items-center gap-2 rounded-input px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: '#3a7bd5' }}>
            <span className="text-lg leading-none">+</span> Ajouter un ordre
          </button>
        </div>

        {/* Mobile : liste cartes */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : ordres.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucun ordre enregistré</p>
            </div>
          ) : ordres.map(o => (
            <div key={o.id} className="rounded-card p-4" style={{ backgroundColor: '#0c0c24', ...B }}>
              <div className="flex items-center justify-between mb-3">
                <span style={BADGE}>{o.indice}</span>
                <span className="text-text-muted text-xs font-mono">{new Date(o.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['Parts', fmt(o.nb_parts, 4)], ['PRU', fmt(o.pru, 4) + ' €'], ['Frais', fmt(o.frais) + ' €'], ['Prix TTC', fmt(o.prix_ttc) + ' €']].map(([l, v]) => (
                  <div key={l}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">{l}</p>
                    <p className="text-text-primary text-sm font-bold mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop : tableau */}
        <div className="hidden md:block">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : ordres.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucun ordre enregistré</p>
            </div>
          ) : (
            <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#0c0c24', ...B }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Indice', 'Parts', 'PRU', 'Frais', 'Prix TTC'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-mono text-[9px] uppercase tracking-[2px] text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordres.map((o, i) => (
                    <tr key={o.id} style={{ borderBottom: i < ordres.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td className="px-5 py-3 text-text-muted font-mono text-xs">{new Date(o.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-3"><span style={BADGE}>{o.indice}</span></td>
                      <td className="px-5 py-3 text-text-primary font-medium">{fmt(o.nb_parts, 4)}</td>
                      <td className="px-5 py-3 text-text-primary font-medium">{fmt(o.pru, 4)} €</td>
                      <td className="px-5 py-3 text-text-muted">{fmt(o.frais)} €</td>
                      <td className="px-5 py-3 text-text-primary font-bold">{fmt(o.prix_ttc)} €</td>
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

      {showModal && <Modal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchOrdres() }} />}
    </PageWrapper>
  )
}
