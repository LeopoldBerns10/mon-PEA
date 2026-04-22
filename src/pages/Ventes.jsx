import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const BADGE = { background: '#0d2040', border: '1px solid #1e3a6e', color: '#f0c040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const INPUT = 'w-full rounded-input px-3 py-3 text-text-primary text-sm outline-none transition-colors bg-bg-input'
const LABEL = 'font-mono uppercase text-[9px] tracking-[2px] text-text-muted'

function todayFR() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function parseDateFR(str) {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function fmt(val, dec = 2) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function gainColor(val) { return val >= 0 ? '#2a9a5a' : '#a04a4a' }
function isOuvert(o) { return !o.statut || o.statut === 'ouvert' }

function groupByYear(items) {
  const groups = {}
  items.forEach(item => {
    const year = new Date(item.date + 'T00:00:00').getFullYear()
    if (!groups[year]) groups[year] = []
    groups[year].push(item)
  })
  return Object.entries(groups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, grp]) => ({ year: Number(year), items: grp }))
}

function YearSepRow({ colSpan, year }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '10px 20px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: '#1a1a3a' }} />
          <span style={{ color: '#3a5080', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>{year}</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#1a1a3a' }} />
        </div>
      </td>
    </tr>
  )
}

function YearSepCard({ year }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 2px' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: '#1a1a3a' }} />
      <span style={{ color: '#3a5080', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>{year}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: '#1a1a3a' }} />
    </div>
  )
}

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
)

function BadgeIndice({ text }) {
  const long = text && text.length > 6
  return <span style={{ ...BADGE, fontSize: long ? '9px' : '11px' }}>{text}</span>
}

function EditCellIndice({ vente, editingId, editValue, onStart, onChange, onCommit, actifsTickers }) {
  const isEditing = editingId === vente.id

  if (isEditing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input
          autoFocus
          list="ventes-actifs-list"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          onBlur={() => onCommit(vente)}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(vente) }}
          className="bg-transparent text-text-primary outline-none text-sm uppercase"
          style={{ borderBottom: '1px solid #3a7bd5', minWidth: 80 }}
        />
        <datalist id="ventes-actifs-list">
          {actifsTickers.map(t => <option key={t} value={t} />)}
        </datalist>
      </span>
    )
  }
  return (
    <span
      onClick={() => onStart(vente)}
      className="cursor-pointer hover:opacity-70 transition-opacity"
      title="Cliquer pour modifier"
    >
      <BadgeIndice text={vente.indice} />
    </span>
  )
}

function Modal({ onClose, onSaved, ordresOuverts }) {
  const [date, setDate] = useState(todayFR())
  const [indice, setIndice] = useState('')
  const [nbParts, setNbParts] = useState('')
  const [prixVente, setPrixVente] = useState('')
  const [frais, setFrais] = useState('1.89')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const positionsMap = {}
  ordresOuverts.forEach(o => {
    if (!positionsMap[o.indice]) positionsMap[o.indice] = { parts: 0, ordres: [] }
    positionsMap[o.indice].parts += Number(o.nb_parts)
    positionsMap[o.indice].ordres.push(o)
  })
  const positions = Object.entries(positionsMap)
    .filter(([, p]) => p.parts > 0.0001)
    .map(([ticker, p]) => ({ indice: ticker, parts: p.parts, ordres: p.ordres }))

  const positionSel = positions.find(p => p.indice === indice)

  useEffect(() => {
    if (positions.length > 0 && !indice) setIndice(positions[0].indice)
  }, [positions.length])

  const ordresDeLIndice = positionSel?.ordres || []
  const totalInvesti = ordresDeLIndice.reduce((s, o) => s + Number(o.nb_parts) * Number(o.pru) + Number(o.frais), 0)
  const totalParts = ordresDeLIndice.reduce((s, o) => s + Number(o.nb_parts), 0)
  const pruMoyen = totalParts > 0 ? totalInvesti / totalParts : 0

  const montantRecupere = nbParts && prixVente ? Number(nbParts) * Number(prixVente) - Number(frais || 0) : null
  const coutAchat = nbParts ? Number(nbParts) * pruMoyen : null
  const gainNet = montantRecupere !== null && coutAchat !== null ? montantRecupere - coutAchat : null
  const pctRealise = gainNet !== null && coutAchat > 0 ? (gainNet / coutAchat) * 100 : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!positionSel) { setError('Aucune position disponible'); return }
    if (Number(nbParts) > positionSel.parts + 0.0001) {
      setError(`Maximum ${fmt(positionSel.parts, 4)} parts disponibles`)
      return
    }
    const isoDate = parseDateFR(date)
    if (!isoDate) { setError('Date invalide — format JJ/MM/AAAA'); return }

    setLoading(true)
    try {
      const ordresFIFO = [...ordresDeLIndice].sort((a, b) => new Date(a.date) - new Date(b.date))
      let partsRestantes = Number(nbParts)

      for (const ordre of ordresFIFO) {
        if (partsRestantes <= 0.0001) break
        const partsOrdre = Number(ordre.nb_parts)
        if (partsOrdre <= partsRestantes + 0.0001) {
          const pctOrdre = Number(ordre.pru) > 0
            ? (Number(prixVente) - Number(ordre.pru)) / Number(ordre.pru) * 100
            : null
          await supabase.from('ordres').update({
            statut: 'vendu',
            pct_realise: pctOrdre,
            prix_vente_reel: Number(prixVente),
          }).eq('id', ordre.id)
          partsRestantes -= partsOrdre
        } else {
          await supabase.from('ordres').update({
            nb_parts: partsOrdre - partsRestantes,
          }).eq('id', ordre.id)
          partsRestantes = 0
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from('ventes').insert({
        user_id: user.id,
        date: isoDate,
        indice,
        nb_parts: Number(nbParts),
        prix_vente: Number(prixVente),
        frais: Number(frais || 0),
        gain_euros: gainNet,
        gain_pct: pctRealise,
      })
      if (err) { setError(err.message); setLoading(false); return }
      onSaved()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
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
              <input
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
                placeholder="JJ/MM/AAAA"
                required
                className={INPUT}
                style={{ ...B, backgroundColor: '#07071a' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Actif</label>
              <select value={indice} onChange={e => setIndice(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }}>
                {positions.map(p => (
                  <option key={p.indice} value={p.indice}>
                    {p.indice} — {fmt(p.parts, 4)} parts disponibles
                  </option>
                ))}
              </select>
            </div>

            {positionSel && (
              <div className="rounded-input px-4 py-2.5" style={{ backgroundColor: '#07071a', ...B }}>
                <p className={LABEL}>PRU moyen pondéré</p>
                <p className="text-text-primary font-bold text-sm mt-1">{fmt(pruMoyen, 4)} €</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Nombre de parts</label>
                <input
                  type="number" step="0.0001" min="0"
                  max={positionSel?.parts}
                  value={nbParts}
                  onChange={e => setNbParts(e.target.value)}
                  required placeholder="0.0000"
                  className={INPUT} style={{ ...B, backgroundColor: '#07071a' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Prix de vente (€)</label>
                <input
                  type="number" step="0.0001" min="0"
                  value={prixVente}
                  onChange={e => setPrixVente(e.target.value)}
                  required placeholder="0.0000"
                  className={INPUT} style={{ ...B, backgroundColor: '#07071a' }}
                />
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
                {gainNet !== null && (
                  <div className="flex justify-between">
                    <p className={LABEL}>Gain / Perte</p>
                    <p className="font-bold text-sm" style={{ color: gainColor(gainNet) }}>
                      {gainNet >= 0 ? '+' : ''}{fmt(gainNet)} €
                      {pctRealise !== null && <span className="text-xs ml-1">({pctRealise >= 0 ? '+' : ''}{fmt(pctRealise)} %)</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-xs text-center" style={{ color: '#a04a4a' }}>{error}</p>}

            <div className="flex gap-3 mt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>
                Annuler
              </button>
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
  const [actifs, setActifs] = useState([])
  const [ordresOuverts, setOrdresOuverts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  async function fetchData() {
    setLoading(true)
    const [{ data: ventesData }, { data: ordresData }, { data: actifsData }] = await Promise.all([
      supabase.from('ventes').select('*').order('date', { ascending: true }),
      supabase.from('ordres').select('*').order('date', { ascending: true }),
      supabase.from('actifs').select('*'),
    ])
    setVentes(ventesData || [])
    setOrdresOuverts((ordresData || []).filter(isOuvert))
    setActifs(actifsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function startEditIndice(vente) {
    setEditingId(vente.id)
    setEditValue(vente.indice)
  }

  async function commitEditIndice(vente) {
    if (!editingId) return
    await supabase.from('ventes').update({ indice: editValue }).eq('id', vente.id)
    setEditingId(null)
    fetchData()
  }

  async function deleteVente(id) {
    if (!window.confirm('Supprimer cette ligne ?')) return
    await supabase.from('ventes').delete().eq('id', id)
    fetchData()
  }

  function getGainDisplay(v) {
    const produit = Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais)
    if (v.gain_euros != null && v.gain_pct != null) {
      return { produit, gain: Number(v.gain_euros), pct: Number(v.gain_pct) }
    }
    return { produit, gain: null, pct: null }
  }

  const actifsTickers = actifs.map(a => a.ticker)
  const groups = groupByYear(ventes)

  return (
    <PageWrapper>
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-5 md:px-8 pt-10 pb-6">

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
          ) : groups.map(({ year, items }) => (
            <div key={year}>
              <YearSepCard year={year} />
              {items.map(v => {
                const { produit, gain, pct } = getGainDisplay(v)
                return (
                  <div key={v.id} className="rounded-card p-4 mb-3" style={{ backgroundColor: '#0c0c24', ...B }}>
                    <div className="flex items-center justify-between mb-3">
                      <BadgeIndice text={v.indice} />
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold" style={{ color: '#8bb8f0' }}>{new Date(v.date).toLocaleDateString('fr-FR')}</span>
                        <button
                          onClick={() => deleteVente(v.id)}
                          title="Supprimer"
                          style={{ color: '#a04a4a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, display: 'flex', alignItems: 'center' }}
                          className="hover:opacity-100 transition-opacity"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[['Parts vendues', fmt(v.nb_parts, 4)], ['Prix de vente', fmt(v.prix_vente, 4) + ' €'], ['Frais', fmt(v.frais) + ' €'], ['Montant récupéré', fmt(produit) + ' €']].map(([l, val]) => (
                        <div key={l}>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">{l}</p>
                          <p className="text-text-primary text-sm font-bold mt-0.5">{val}</p>
                        </div>
                      ))}
                      {gain !== null && (
                        <div className="col-span-2">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Gain / Perte</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: gainColor(gain) }}>
                            {gain >= 0 ? '+' : ''}{fmt(gain)} €
                            {pct !== null && <span className="text-xs ml-1">({pct >= 0 ? '+' : ''}{fmt(pct)} %)</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
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
                    {['Date', 'Indice', 'Parts', 'Prix vente', 'Frais', 'Montant récupéré', 'Gain €', 'Gain %', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-mono text-[9px] uppercase tracking-[2px] text-text-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(({ year, items }) => (
                    <>
                      <YearSepRow key={`sep-${year}`} colSpan={9} year={year} />
                      {items.map((v, i) => {
                        const { produit, gain, pct } = getGainDisplay(v)
                        return (
                          <tr key={v.id} style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#8bb8f0' }}>{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-4 py-3">
                              <EditCellIndice
                                vente={v}
                                editingId={editingId}
                                editValue={editValue}
                                onStart={startEditIndice}
                                onChange={setEditValue}
                                onCommit={commitEditIndice}
                                actifsTickers={actifsTickers}
                              />
                            </td>
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
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => deleteVente(v.id)}
                                title="Supprimer"
                                style={{ color: '#a04a4a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', opacity: 0.5, display: 'inline-flex', alignItems: 'center' }}
                                className="hover:opacity-100 transition-opacity"
                              >
                                <TrashIcon />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-end pr-5 pointer-events-none z-40">
        <button onClick={() => setShowModal(true)} className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl" style={{ backgroundColor: '#3a7bd5' }}>+</button>
      </div>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
          ordresOuverts={ordresOuverts}
        />
      )}
    </PageWrapper>
  )
}
