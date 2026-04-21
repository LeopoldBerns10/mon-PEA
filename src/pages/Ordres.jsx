import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'
import { getPrixMultiple } from '../services/prixLive'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const BADGE = { background: '#0d2040', border: '1px solid #1e3a6e', color: '#f0c040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const BADGE_VENDU = { background: '#2a0a0a', border: '1px solid #a04a4a', color: '#a04a4a', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const INPUT = 'w-full rounded-input px-3 py-3 text-text-primary text-sm outline-none transition-colors bg-bg-input'
const LABEL = 'font-mono uppercase text-[9px] tracking-[2px] text-text-muted'

const today = () => new Date().toISOString().split('T')[0]

function fmt(val, dec = 2) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function gainColor(val) { return val >= 0 ? '#2a9a5a' : '#a04a4a' }
function isOuvert(o) { return !o.statut || o.statut === 'ouvert' }

function EditCell({ ordre, field, display, editing, editValue, onStart, onChange, onCommit }) {
  const isEditing = editing?.id === ordre.id && editing?.field === field
  const editable = isOuvert(ordre)

  if (isEditing) {
    return (
      <input
        autoFocus
        value={editValue}
        onChange={e => onChange(e.target.value)}
        onBlur={() => onCommit(ordre)}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(ordre) }}
        className="bg-transparent text-text-primary outline-none text-sm"
        style={{ borderBottom: '1px solid #3a7bd5', minWidth: 60 }}
      />
    )
  }
  return (
    <span
      onClick={() => editable && onStart(ordre, field)}
      className={editable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}
      title={editable ? 'Cliquer pour modifier' : ''}
    >
      {display}
    </span>
  )
}

function Modal({ onClose, onSaved, actifs, prixMap }) {
  const [date, setDate] = useState(today())
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
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('ordres').insert({
      user_id: user.id,
      date,
      indice: actifSel.ticker,
      nb_parts: Number(nbParts),
      pru: Number(pru),
      frais: Number(frais || 0),
      statut: 'ouvert',
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
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Actif</label>
            {actifs.length === 0 ? (
              <p className="text-xs" style={{ color: '#a04a4a' }}>Ajoutez d'abord un actif dans la page Actifs.</p>
            ) : (
              <select value={actifId} onChange={e => handleActifChange(e.target.value)} required className={INPUT} style={{ ...B, backgroundColor: '#07071a' }}>
                {actifs.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.ticker} — {a.nom}{prixMap[a.ticker] ? ` · ${fmt(prixMap[a.ticker])} €` : ''}
                  </option>
                ))}
              </select>
            )}
            {prixLive && (
              <p className="text-xs font-mono" style={{ color: '#3a5080' }}>
                Prix live : <span style={{ color: '#5a9aee' }}>{fmt(prixLive)} €</span>
              </p>
            )}
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

          {error && <p className="text-xs text-center" style={{ color: '#a04a4a' }}>{error}</p>}

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>
              Annuler
            </button>
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
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')

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

  function startEdit(ordre, field) {
    setEditing({ id: ordre.id, field })
    setEditValue(String(ordre[field] ?? ''))
  }

  async function commitEdit(ordre) {
    if (!editing) return
    const { field } = editing
    const numFields = ['nb_parts', 'pru', 'frais']
    const value = numFields.includes(field) ? Number(editValue) : editValue
    await supabase.from('ordres').update({ [field]: value }).eq('id', ordre.id)
    setEditing(null)
    fetchAll()
  }

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

        {/* Mobile : cartes */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <p className="text-text-muted text-sm">Chargement…</p>
          ) : ordres.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucun ordre enregistré</p>
            </div>
          ) : ordres.map(o => {
            const vendu = !isOuvert(o)
            const prixLive = prixMap[o.indice]
            const prixTTC = Number(o.nb_parts) * Number(o.pru) + Number(o.frais)
            const pctBenef = !vendu && prixLive ? ((prixLive - Number(o.pru)) / Number(o.pru)) * 100 : null
            const gainEuros = !vendu && prixLive ? (prixLive - Number(o.pru)) * Number(o.nb_parts) : null
            return (
              <div key={o.id} className="rounded-card p-4" style={{ backgroundColor: '#0c0c24', ...B, opacity: vendu ? 0.6 : 1 }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={BADGE}>{o.indice}</span>
                    {vendu && <span style={BADGE_VENDU}>VENDU</span>}
                  </div>
                  <span className="text-text-muted text-xs font-mono">{new Date(o.date).toLocaleDateString('fr-FR')}</span>
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
                        {o.pct_realise >= 0 ? '+' : ''}{fmt(o.pct_realise)} %
                        {o.prix_vente_reel ? ` · ${fmt(o.prix_vente_reel)} €` : ''}
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
          ) : ordres.length === 0 ? (
            <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
              <p className="text-text-muted text-sm">Aucun ordre enregistré</p>
            </div>
          ) : (
            <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#0c0c24', ...B }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Indice', 'Parts', 'PRU', 'Frais', 'Prix TTC', 'Bénéf / Réalisé'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-mono text-[9px] uppercase tracking-[2px] text-text-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordres.map((o, i) => {
                    const vendu = !isOuvert(o)
                    const prixLive = prixMap[o.indice]
                    const prixTTC = Number(o.nb_parts) * Number(o.pru) + Number(o.frais)
                    const pctBenef = !vendu && prixLive ? ((prixLive - Number(o.pru)) / Number(o.pru)) * 100 : null
                    const gainEuros = !vendu && prixLive ? (prixLive - Number(o.pru)) * Number(o.nb_parts) : null
                    return (
                      <tr
                        key={o.id}
                        style={{
                          borderBottom: i < ordres.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          opacity: vendu ? 0.6 : 1,
                        }}
                      >
                        <td className="px-5 py-3">
                          <EditCell
                            ordre={o} field="date"
                            display={<span className="text-text-muted font-mono text-xs">{new Date(o.date).toLocaleDateString('fr-FR')}</span>}
                            editing={editing} editValue={editValue}
                            onStart={startEdit} onChange={setEditValue} onCommit={commitEdit}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span style={BADGE}>{o.indice}</span>
                            {vendu && <span style={BADGE_VENDU}>VENDU</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <EditCell
                            ordre={o} field="nb_parts"
                            display={<span className="text-text-primary font-medium">{fmt(o.nb_parts, 4)}</span>}
                            editing={editing} editValue={editValue}
                            onStart={startEdit} onChange={setEditValue} onCommit={commitEdit}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <EditCell
                            ordre={o} field="pru"
                            display={<span className="text-text-primary font-medium">{fmt(o.pru, 4)} €</span>}
                            editing={editing} editValue={editValue}
                            onStart={startEdit} onChange={setEditValue} onCommit={commitEdit}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <EditCell
                            ordre={o} field="frais"
                            display={<span className="text-text-muted">{fmt(o.frais)} €</span>}
                            editing={editing} editValue={editValue}
                            onStart={startEdit} onChange={setEditValue} onCommit={commitEdit}
                          />
                        </td>
                        <td className="px-5 py-3 text-text-primary font-bold">{fmt(prixTTC)} €</td>
                        <td className="px-5 py-3 font-bold">
                          {!vendu && pctBenef !== null ? (
                            <span style={{ color: gainColor(pctBenef) }}>
                              {pctBenef >= 0 ? '+' : ''}{fmt(pctBenef)} %
                              {gainEuros !== null && <span className="text-xs ml-1 opacity-70">· {gainEuros >= 0 ? '+' : ''}{fmt(gainEuros)} €</span>}
                            </span>
                          ) : vendu && o.pct_realise != null ? (
                            <span style={{ color: gainColor(o.pct_realise) }}>
                              {o.pct_realise >= 0 ? '+' : ''}{fmt(o.pct_realise)} %
                            </span>
                          ) : (
                            <span style={{ color: '#3a5080' }}>—</span>
                          )}
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

      <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-end pr-5 pointer-events-none z-40">
        <button onClick={() => setShowModal(true)} className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl" style={{ backgroundColor: '#3a7bd5' }}>+</button>
      </div>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll() }}
          actifs={actifs}
          prixMap={prixMap}
        />
      )}
    </PageWrapper>
  )
}
