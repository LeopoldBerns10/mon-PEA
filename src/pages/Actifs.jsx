import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'
import { getPrixLive, getPrixMultiple } from '../services/prixLive'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const BADGE = { background: '#0d2040', border: '1px solid #1e3a6e', color: '#f0c040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const INPUT = 'w-full rounded-input px-3 py-3 text-text-primary text-sm outline-none transition-colors bg-bg-input'
const LABEL = 'font-mono uppercase text-[9px] tracking-[2px] text-text-muted'

const EXEMPLES = [
  ['WPEA.PA', 'Amundi MSCI World UCITS ETF'],
  ['DCAM.PA', 'BNP Paribas Easy MSCI World'],
  ['TTE.PA', 'TotalEnergies'],
  ['MC.PA', 'LVMH'],
  ['AIR.PA', 'Airbus'],
  ['PANX.PA', 'Invesco NASDAQ-100'],
  ['PAEEM.PA', 'Amundi MSCI Emerging Markets'],
]

function fmt(val, dec = 2) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function Modal({ onClose, onSaved }) {
  const [ticker, setTicker] = useState('')
  const [nom, setNom] = useState('')
  const [tickerYahoo, setTickerYahoo] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleTest() {
    if (!tickerYahoo) return
    setTesting(true)
    setTestResult(null)
    const prix = await getPrixLive(tickerYahoo.trim())
    setTestResult(prix)
    setTesting(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('actifs').insert({
      user_id: user.id,
      ticker: ticker.trim().toUpperCase(),
      nom: nom.trim(),
      ticker_yahoo: tickerYahoo.trim(),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-card p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#0c0c24', ...B }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary font-black text-base">Nouvel actif</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Ticker (ex: WPEA)</label>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              required
              placeholder="WPEA"
              className={INPUT}
              style={{ ...B, backgroundColor: '#07071a' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Nom complet</label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              required
              placeholder="Amundi MSCI World UCITS ETF"
              className={INPUT}
              style={{ ...B, backgroundColor: '#07071a' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className={LABEL}>Ticker Yahoo Finance</label>
              <a
                href="https://finance.yahoo.com/lookup/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono underline"
                style={{ color: '#5a9aee' }}
              >
                Trouver mon ticker →
              </a>
            </div>
            <input
              type="text"
              value={tickerYahoo}
              onChange={e => setTickerYahoo(e.target.value)}
              required
              placeholder="WPEA.PA"
              className={INPUT}
              style={{ ...B, backgroundColor: '#07071a' }}
            />
          </div>

          <div className="rounded-input px-3 py-2.5 leading-relaxed" style={{ backgroundColor: '#07071a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-1.5">Exemples courants</p>
            {EXEMPLES.map(([t, n]) => (
              <div key={t} className="flex gap-3 text-[10px] font-mono">
                <span style={{ color: '#f0c040', minWidth: 72 }}>{t}</span>
                <span className="text-text-muted">{n}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={!tickerYahoo || testing}
              className="flex-1 rounded-input py-2.5 text-sm font-bold disabled:opacity-40"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#5a9aee', backgroundColor: 'transparent' }}
            >
              {testing ? 'Test en cours…' : 'Tester le prix'}
            </button>
            {testResult !== null && (
              <div className="flex-1 text-center">
                {testResult
                  ? <span className="font-bold text-sm" style={{ color: '#2a9a5a' }}>{fmt(testResult)} € ✓</span>
                  : <span className="text-xs" style={{ color: '#a04a4a' }}>Ticker introuvable, vérifie le code</span>
                }
              </div>
            )}
          </div>

          {error && <p className="text-xs text-center" style={{ color: '#a04a4a' }}>{error}</p>}

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-input py-3 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#3a7bd5' }}>
              {loading ? 'Enregistrement…' : "Ajouter l'actif"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDelete({ actif, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-card p-6" style={{ backgroundColor: '#0c0c24', ...B }}>
        <h2 className="text-text-primary font-black text-base mb-2">Supprimer {actif.ticker} ?</h2>
        <p className="text-text-muted text-sm mb-6">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-input py-3 text-sm font-bold" style={{ ...B, color: '#5a9aee', backgroundColor: 'transparent' }}>
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-input py-3 text-sm font-bold text-white" style={{ backgroundColor: '#a04a4a' }}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Actifs() {
  const [actifs, setActifs] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function fetchActifs() {
    setLoading(true)
    const { data } = await supabase.from('actifs').select('*').order('ticker')
    const list = data || []
    setActifs(list)
    setLoading(false)
    if (list.length > 0) {
      const p = await getPrixMultiple(list)
      setPrices(p)
    }
  }

  async function refreshPrices() {
    if (actifs.length === 0) return
    setRefreshing(true)
    const p = await getPrixMultiple(actifs)
    setPrices(p)
    setRefreshing(false)
  }

  async function handleDelete() {
    await supabase.from('actifs').delete().eq('id', deleteConfirm.id)
    setDeleteConfirm(null)
    fetchActifs()
  }

  useEffect(() => { fetchActifs() }, [])

  return (
    <PageWrapper>
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-5 md:px-8 pt-10 pb-6">

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Mon PEA</p>
            <h1 className="text-text-primary font-black text-xl tracking-tight mt-0.5">Mes actifs</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={refreshPrices}
              disabled={refreshing || actifs.length === 0}
              className="flex items-center gap-1.5 rounded-input px-3 py-2.5 text-xs font-bold disabled:opacity-40"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#5a9aee', backgroundColor: 'transparent' }}
            >
              {refreshing ? '↻ …' : '↻ Rafraîchir'}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-input px-4 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: '#3a7bd5' }}
            >
              <span className="text-lg leading-none">+</span> Ajouter un actif
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-text-muted text-sm">Chargement…</p>
        ) : actifs.length === 0 ? (
          <div className="rounded-card p-5" style={{ backgroundColor: '#0c0c24', ...B }}>
            <p className="text-text-muted text-sm">Aucun actif enregistré. Ajoutez vos ETF et actions.</p>
          </div>
        ) : (
          <>
            {/* Mobile : cartes */}
            <div className="md:hidden flex flex-col gap-3">
              {actifs.map(a => {
                const prix = prices[a.ticker]
                return (
                  <div key={a.id} className="rounded-card p-4" style={{ backgroundColor: '#0c0c24', ...B }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={BADGE}>{a.ticker}</span>
                      <button onClick={() => setDeleteConfirm(a)} className="text-xs" style={{ color: '#3a5080' }}>✕</button>
                    </div>
                    <p className="text-text-primary text-sm font-bold mb-0.5">{a.nom}</p>
                    <p className="text-xs font-mono mb-2" style={{ color: '#3a5080' }}>{a.ticker_yahoo}</p>
                    <p className="text-text-primary font-black text-lg">
                      {prix === undefined ? '…' : prix === null ? <span className="text-sm" style={{ color: '#a04a4a' }}>Introuvable</span> : fmt(prix) + ' €'}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Desktop : tableau */}
            <div className="hidden md:block rounded-card overflow-hidden" style={{ backgroundColor: '#0c0c24', ...B }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Ticker', 'Nom', 'Yahoo Finance', 'Prix live', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-mono text-[9px] uppercase tracking-[2px] text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actifs.map((a, i) => {
                    const prix = prices[a.ticker]
                    return (
                      <tr key={a.id} style={{ borderBottom: i < actifs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <td className="px-5 py-3"><span style={BADGE}>{a.ticker}</span></td>
                        <td className="px-5 py-3 text-text-primary">{a.nom}</td>
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: '#3a5080' }}>{a.ticker_yahoo}</td>
                        <td className="px-5 py-3 text-text-primary font-bold">
                          {prix === undefined
                            ? <span style={{ color: '#3a5080' }}>…</span>
                            : prix === null
                            ? <span className="text-xs" style={{ color: '#a04a4a' }}>Introuvable</span>
                            : fmt(prix) + ' €'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => setDeleteConfirm(a)} className="text-xs hover:opacity-75 transition-opacity" style={{ color: '#3a5080' }}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-end pr-5 pointer-events-none z-40">
        <button
          onClick={() => setShowModal(true)}
          className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl"
          style={{ backgroundColor: '#3a7bd5' }}
        >+</button>
      </div>

      {deleteConfirm && (
        <ConfirmDelete actif={deleteConfirm} onConfirm={handleDelete} onCancel={() => setDeleteConfirm(null)} />
      )}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchActifs() }} />
      )}
    </PageWrapper>
  )
}
