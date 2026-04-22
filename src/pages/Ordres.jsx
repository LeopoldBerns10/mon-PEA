import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'
import { getPrixMultiple } from '../services/prixLive'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const BADGE = { background: '#0d2040', border: '1px solid #1e3a6e', color: '#f0c040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const BADGE_VENDU = { background: '#2a0a0a', border: '1px solid #a04a4a', color: '#a04a4a', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const INPUT = 'w-full rounded-input px-3 py-3 text-text-primary text-sm outline-none transition-colors bg-bg-input'
const LABEL = 'font-mono uppercase text-[9px] tracking-[2px] text-text-muted'
const EDIT_INPUT = { borderBottom: '1px solid #3a7bd5', background: 'transparent', outline: 'none', color: '#e8eaf0', fontSize: '0.8125rem', width: '100%' }
const MENU = { position: 'absolute', right: 0, top: '110%', zIndex: 20, background: '#0c1a3a', border: '1px solid #2a4a8a', borderRadius: 8, padding: '4px 0', minWidth: 130, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }
const MENU_EDIT = { display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#3a7bd5', fontSize: 13, fontWeight: 600 }
const MENU_DEL = { display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#a04a4a', fontSize: 13, fontWeight: 600 }

function todayFR() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function parseDateFR(str) {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function isoToFR(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
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
    .sort(([a], [b]) => Number(b) - Number(a))
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

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

function BadgeIndice({ text }) {
  const long = text && text.length > 6
  return <span style={{ ...BADGE, fontSize: long ? '9px' : '11px' }}>{text}</span>
}

function Modal({ onClose, onSaved, actifs, prixMap }) {
  const [date, setDate] = useState(todayFR())
  const [actifId, setActifId] = useState(actifs[0]?.id || '')
  const [nbParts, setNbParts] = useState('')
  const [pru, setPru] = useState('')
  const [frais, setFrais] = useState('1.89')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const actifSel = actifs.find(a => a.id === actifId)
  const prixLive = actifSel ? prixMap[actifSel.ticker] : null

  function handleActifChange(id) {
    setActifId(id)
    const a = actifs.find(x => x.id === id)
    const p = a ? prixMap[a.ticker] : null
    if (p) setPru(String(p))
  }

  useEffect(() => {
    if (actifId && !pru) {
      const a = actifs.find(x => x.id === actifId)
      const p = a ? prixMap[a.ticker] : null
      if (p) setPru(String(p))
    }
  }, [prixMap])

  const prixTTC = nbParts && pru ? Number(nbParts) * Number(pru) + Number(frais || 0) : null
  const pruTTC = prixTTC && nbParts ? prixTTC / Number(nbParts) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!actifSel) { setError('Sélectionnez un actif'); return }
    const isoDate = parseDateFR(date)
    if (!isoDate) { setError('Date invalide — format JJ/MM/AAAA'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('ordres').insert({
      user_id: user.id, date: isoDate, indice: actifSel.ticker,
      nb_parts: Number(nbParts), pru: Number(pru), frais: Number(frais || 0), statut: 'ouvert',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-card p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#0c0c24', ...B }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-black text-base">Nouvel ordre</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Date</label>
            <input type="text" value={date} onChange={e => setDate(e.target.value)} placeholder="JJ/MM/AAAA" required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Actif</label>
            {actifs.length === 0 ? (
              <p className="text-xs" style={{ color: '#a04a4a' }}>Ajoutez d'abord un actif dans la page Actifs.</p>
            ) : (
              <select value={actifId} onChange={e => handleActifChange(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }}>
                {actifs.map(a => (
                  <option key={a.id} value={a.id}>{a.ticker} — {a.nom}{prixMap[a.ticker] ? ` · ${fmt(prixMap[a.ticker])} €` : ''}</option>
                ))}
              </select>
            )}
            {prixLive && <p className="text-xs font-mono" style={{ color: '#3a5080' }}>Prix live : <span style={{ color: '#5a9aee' }}>{fmt(prixLive)} €</span></p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Nombre de parts</label>
              <input type="number" step="0.0001" min="0" value={nbParts} onChange={e => setNbParts(e.target.value)} required placeholder="0.0000" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>PRU (€)</label>
              <input type="number" step="0.0001" min="0" value={pru} onChange={e => setPru(e.target.value)} required placeholder="0.0000" className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Frais (€)</label>
            <input type="number" step="0.01" min="0" value={frais} onChange={e => setFrais(e.target.value)} className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
          </div>
          {prixTTC !== null && (
            <div className="rounded-input px-4 py-3 flex justify-between" style={{ backgroundColor: '#07071a', ...B }}>
              <div><p className={LABEL}>Prix TTC</p><p className="text-text-primary font-bold mt-1">{fmt(prixTTC)} €</p></div>
              <div className="text-right"><p className={LABEL}>PRU TTC</p><p className="text-text-primary font-bold mt-1">{fmt(pruTTC, 4)} €</p></div>
            </div>
          )}
          {error && <p className="text-xs text-center" style={{ color: '#a04a4a' }}>{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>Annuler</button>
            <button type="submit" disabled={loading || actifs.length === 0} className="flex-1 rounded-input py-3 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#3a7bd5' }}>
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
  const [actifs, setActifs] = useState([])
  const [prixMap, setPrixMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)

  async function fetchAll() {
    setLoading(true)
    const [{ data: ordresData }, { data: actifsData }] = await Promise.all([
      supabase.from('ordres').select('*').order('date', { ascending: false }),
      supabase.from('actifs').select('*'),
    ])
    setOrdres(ordresData || [])
    setActifs(actifsData || [])
    setLoading(false)
    if (actifsData?.length > 0) {
      const p = await getPrixMultiple(actifsData)
      setPrixMap(p)
    }
  }

  useEffect(() => { fetchAll() }, [])

  function startEditRow(o) {
    setEditRow({ id: o.id, date: isoToFR(o.date), indice: o.indice, nb_parts: String(o.nb_parts), pru: String(o.pru), frais: String(o.frais) })
  }

  async function saveEditRow() {
    if (!editRow) return
    const isoDate = parseDateFR(editRow.date)
    if (!isoDate) { alert('Date invalide — format JJ/MM/AAAA'); return }
    await supabase.from('ordres').update({
      date: isoDate, indice: editRow.indice,
      nb_parts: Number(editRow.nb_parts), pru: Number(editRow.pru), frais: Number(editRow.frais),
    }).eq('id', editRow.id)
    setEditRow(null)
    fetchAll()
  }

  async function deleteOrdre(id) {
    if (!window.confirm('Supprimer cette ligne ?')) return
    await supabase.from('ordres').delete().eq('id', id)
    fetchAll()
  }

  const actifsTickers = actifs.map(a => a.ticker)
  const groups = groupByYear(ordres)

  return (
    <PageWrapper>
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-5 md:px-8 pt-10 pb-6">

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Mon PEA</p>
            <h1 className="text-text-primary font-black text-xl tracking-tight mt-0.5">Mes ordres</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="hidden md:flex items-center gap-2 rounded-input px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: '#3a7bd5' }}>
            <span className="text-lg leading-none">+</span> Ajouter un ordre
          </button>
        </div>

        {/* Overlay ferme le menu contextuel mobile */}
        {menuOpen && <div onClick={() => setMenuOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />}

        {/* Mobile : cartes */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : ordres.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucun ordre enregistré</p>
            </div>
          ) : groups.map(({ year, items }) => (
            <div key={year}>
              <YearSepCard year={year} />
              {items.map(o => {
                const vendu = !isOuvert(o)
                const prixTTC = Number(o.nb_parts) * Number(o.pru) + Number(o.frais)
                const prixLive = prixMap[o.indice]
                const pctBenef = !vendu && prixLive ? ((prixLive - Number(o.pru)) / Number(o.pru)) * 100 : null
                const gainEuros = !vendu && prixLive ? (prixLive - Number(o.pru)) * Number(o.nb_parts) : null
                const isEditing = editRow?.id === o.id

                if (isEditing) {
                  return (
                    <div key={o.id} className="rounded-card p-4 mb-3" style={{ backgroundColor: '#0c0c24', border: '1px solid #3a7bd5' }}>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-3">Modifier l'ordre</p>
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-1">Date</p>
                          <input value={editRow.date} onChange={e => setEditRow({ ...editRow, date: e.target.value })} placeholder="JJ/MM/AAAA" style={{ ...EDIT_INPUT }} />
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-1">Indice</p>
                          <input list="mob-actifs-list" value={editRow.indice} onChange={e => setEditRow({ ...editRow, indice: e.target.value })} style={{ ...EDIT_INPUT }} className="uppercase" />
                          <datalist id="mob-actifs-list">{actifsTickers.map(t => <option key={t} value={t} />)}</datalist>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-1">Parts</p>
                            <input type="number" value={editRow.nb_parts} onChange={e => setEditRow({ ...editRow, nb_parts: e.target.value })} style={{ ...EDIT_INPUT }} />
                          </div>
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-1">PRU</p>
                            <input type="number" value={editRow.pru} onChange={e => setEditRow({ ...editRow, pru: e.target.value })} style={{ ...EDIT_INPUT }} />
                          </div>
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-1">Frais</p>
                            <input type="number" value={editRow.frais} onChange={e => setEditRow({ ...editRow, frais: e.target.value })} style={{ ...EDIT_INPUT }} />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button onClick={saveEditRow} className="flex-1 rounded-input py-2 text-sm font-bold text-white" style={{ backgroundColor: '#2a9a5a' }}>✓ Sauvegarder</button>
                          <button onClick={() => setEditRow(null)} className="flex-1 rounded-input py-2 text-sm font-bold" style={{ ...B, color: '#a04a4a', backgroundColor: 'transparent' }}>✗ Annuler</button>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={o.id} className="rounded-card p-4 mb-3" style={{ backgroundColor: '#0c0c24', ...B }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BadgeIndice text={o.indice} />
                        {vendu && <span style={BADGE_VENDU}>VENDU</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold" style={{ color: '#8bb8f0' }}>{new Date(o.date).toLocaleDateString('fr-FR')}</span>
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setMenuOpen(menuOpen === o.id ? null : o.id)}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', color: '#8899bb', fontSize: 15, fontWeight: 700, lineHeight: 1 }}
                          >···</button>
                          {menuOpen === o.id && (
                            <div style={MENU}>
                              <button style={MENU_EDIT} onClick={() => { startEditRow(o); setMenuOpen(null) }}>Modifier</button>
                              <button style={MENU_DEL} onClick={() => { setMenuOpen(null); deleteOrdre(o.id) }}>Supprimer</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[['Parts', fmt(o.nb_parts, 4)], ['PRU', fmt(o.pru, 4) + ' €'], ['Frais', fmt(o.frais) + ' €'], ['Prix TTC', fmt(prixTTC) + ' €']].map(([l, v]) => (
                        <div key={l}>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">{l}</p>
                          <p className="text-text-primary text-sm font-bold mt-0.5">{v}</p>
                        </div>
                      ))}
                      {!vendu && pctBenef !== null && (
                        <div className="col-span-2">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Bénéfice live</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: gainColor(pctBenef) }}>
                            {pctBenef >= 0 ? '+' : ''}{fmt(pctBenef)} % · {gainEuros >= 0 ? '+' : ''}{fmt(gainEuros)} €
                          </p>
                        </div>
                      )}
                      {vendu && o.pct_realise != null && (
                        <div className="col-span-2">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">% Réalisé</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: gainColor(o.pct_realise) }}>
                            {o.pct_realise >= 0 ? '+' : ''}{fmt(o.pct_realise)} %{o.prix_vente_reel ? ` · ${fmt(o.prix_vente_reel)} €` : ''}
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
          ) : ordres.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucun ordre enregistré</p>
            </div>
          ) : (
            <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#0c0c24', ...B, maxWidth: 1100 }}>
              <table className="w-full" style={{ fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Indice', 'Parts', 'PRU', 'Frais', 'Prix TTC', 'Bénéf / Réalisé', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(({ year, items }) => (
                    <>
                      <YearSepRow key={`sep-${year}`} colSpan={8} year={year} />
                      {items.map((o, i) => {
                        const vendu = !isOuvert(o)
                        const prixLive = prixMap[o.indice]
                        const prixTTC = Number(o.nb_parts) * Number(o.pru) + Number(o.frais)
                        const pctBenef = !vendu && prixLive ? ((prixLive - Number(o.pru)) / Number(o.pru)) * 100 : null
                        const gainEuros = !vendu && prixLive ? (prixLive - Number(o.pru)) * Number(o.nb_parts) : null
                        const isEditing = editRow?.id === o.id

                        if (isEditing) {
                          return (
                            <tr key={o.id} style={{ backgroundColor: 'rgba(58,123,213,0.07)', borderBottom: '1px solid rgba(58,123,213,0.2)' }}>
                              <td style={{ padding: '8px 12px' }}>
                                <input value={editRow.date} onChange={e => setEditRow({ ...editRow, date: e.target.value })} placeholder="JJ/MM/AAAA" style={{ ...EDIT_INPUT, minWidth: 80 }} />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input list="desk-actifs-list" value={editRow.indice} onChange={e => setEditRow({ ...editRow, indice: e.target.value })} style={{ ...EDIT_INPUT, minWidth: 70 }} className="uppercase" />
                                <datalist id="desk-actifs-list">{actifsTickers.map(t => <option key={t} value={t} />)}</datalist>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="number" value={editRow.nb_parts} onChange={e => setEditRow({ ...editRow, nb_parts: e.target.value })} style={{ ...EDIT_INPUT, minWidth: 65 }} />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="number" value={editRow.pru} onChange={e => setEditRow({ ...editRow, pru: e.target.value })} style={{ ...EDIT_INPUT, minWidth: 65 }} />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="number" value={editRow.frais} onChange={e => setEditRow({ ...editRow, frais: e.target.value })} style={{ ...EDIT_INPUT, minWidth: 50 }} />
                              </td>
                              <td style={{ padding: '8px 12px', color: '#3a5080' }}>—</td>
                              <td style={{ padding: '8px 12px', color: '#3a5080' }}>—</td>
                              <td style={{ padding: '8px 8px' }}>
                                <div className="flex items-center gap-1 justify-end">
                                  <button onClick={saveEditRow} style={{ background: '#2a9a5a', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', padding: '2px 7px', fontSize: 12, fontWeight: 700 }}>✓</button>
                                  <button onClick={() => setEditRow(null)} style={{ background: '#a04a4a', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', padding: '2px 7px', fontSize: 12, fontWeight: 700 }}>✗</button>
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        return (
                          <tr key={o.id} style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="font-mono font-semibold" style={{ color: '#8bb8f0', fontSize: 12 }}>{new Date(o.date).toLocaleDateString('fr-FR')}</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div className="flex items-center gap-2">
                                <BadgeIndice text={o.indice} />
                                {vendu && <span style={BADGE_VENDU}>VENDU</span>}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{fmt(o.nb_parts, 4)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{fmt(o.pru, 4)} €</td>
                            <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{fmt(o.frais)} €</td>
                            <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', fontWeight: 700 }}>{fmt(prixTTC)} €</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                              {!vendu && pctBenef !== null ? (
                                <span style={{ color: gainColor(pctBenef) }}>
                                  {pctBenef >= 0 ? '+' : ''}{fmt(pctBenef)} %
                                  {gainEuros !== null && <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>· {gainEuros >= 0 ? '+' : ''}{fmt(gainEuros)} €</span>}
                                </span>
                              ) : vendu && o.pct_realise != null ? (
                                <span style={{ color: gainColor(o.pct_realise) }}>{o.pct_realise >= 0 ? '+' : ''}{fmt(o.pct_realise)} %</span>
                              ) : (
                                <span style={{ color: '#3a5080' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => startEditRow(o)} title="Modifier" style={{ color: '#f0c040', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', opacity: 0.6, display: 'inline-flex', alignItems: 'center' }} className="hover:opacity-100 transition-opacity"><PencilIcon /></button>
                                <button onClick={() => deleteOrdre(o.id)} title="Supprimer" style={{ color: '#a04a4a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', opacity: 0.6, display: 'inline-flex', alignItems: 'center' }} className="hover:opacity-100 transition-opacity"><TrashIcon /></button>
                              </div>
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
        <Modal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchAll() }} actifs={actifs} prixMap={prixMap} />
      )}
    </PageWrapper>
  )
}
