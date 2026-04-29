import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'
import { getPrixMultiple, getPrixMultipleDetail, getPrixDetail } from '../services/prixLive'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const HERO = { background: 'linear-gradient(135deg,#0d1b3e,#0c0c24)', border: '1px solid #2a4a8a', boxShadow: '0 0 24px rgba(58,123,213,0.15)' }
const BADGE = { background: '#0d2040', border: '1px solid #1e3a6e', color: '#f0c040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }
const BLEU = '#3a7bd5'
const VERT = '#2a9a5a'
const ROUGE = '#a04a4a'
const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtPct(val) {
  const n = Number(val || 0)
  return (n >= 0 ? '+' : '') + n.toFixed(2) + ' %'
}
function fmtM(val, dec = 2) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function Label({ children }) {
  return <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted mb-1.5">{children}</p>
}
function Card({ children, style, className = '' }) {
  return (
    <div className={`rounded-card p-5 ${className}`} style={{ backgroundColor: '#0c0c24', ...B, ...style }}>
      {children}
    </div>
  )
}
function gainColor(val) { return val >= 0 ? VERT : ROUGE }
function isOuvert(o) { return !o.statut || o.statut === 'ouvert' }

function OrdreTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#8bb8f0', fontSize: 11, marginBottom: 4 }}>{d.indice} · {d.date}</div>
      <div style={{ color: '#c8e0ff' }}>Investi : {d.investi.toFixed(2)} €</div>
      <div style={{ color: d.plusvalue >= 0 ? VERT : ROUGE }}>
        {d.plusvalue >= 0 ? '+' : ''}{d.plusvalue.toFixed(2)} € ({d.pct >= 0 ? '+' : ''}{d.pct.toFixed(2)} %)
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [positions, setPositions] = useState([])
  const [prixMap, setPrixMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [injRaw, setInjRaw] = useState([])
  const [ventesRaw, setVentesRaw] = useState([])
  const [ordresAllRaw, setOrdresAllRaw] = useState([])

  // Watchlist
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('pea_watchlist')
      return saved ? JSON.parse(saved) : ['WPEA.PA', 'DCAM.PA']
    } catch { return ['WPEA.PA', 'DCAM.PA'] }
  })
  const [watchData, setWatchData] = useState({})

  // Modal historique bulle
  const [selectedBubble, setSelectedBubble] = useState(null)
  const [bubbleHistory, setBubbleHistory] = useState([])
  const [bubbleLoading, setBubbleLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [{ data: injections }, { data: ordres }, { data: ventes }, { data: actifs }] = await Promise.all([
        supabase.from('injections').select('date, montant, type').order('date', { ascending: true }),
        supabase.from('ordres').select('date, indice, nb_parts, pru, frais, statut, pct_realise, prix_vente_reel').order('date', { ascending: false }),
        supabase.from('ventes').select('date, indice, nb_parts, prix_vente, frais, gain_euros, gain_pct').order('date', { ascending: false }),
        supabase.from('actifs').select('ticker, ticker_yahoo'),
      ])

      const totalInjecte = (injections || []).reduce((s, r) => s + Number(r.montant), 0)
      const totalDepense = (ordres || []).reduce((s, o) => s + Number(o.nb_parts) * Number(o.pru) + Number(o.frais), 0)
      const ordresOuverts = (ordres || []).filter(isOuvert)
      const totalMontantRecupere = (ventes || []).reduce((s, v) => s + Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais), 0)
      const liquidites = totalInjecte - totalDepense + totalMontantRecupere
      const gainNet = liquidites - totalInjecte
      const gainPct = totalInjecte > 0 ? (gainNet / totalInjecte) * 100 : 0

      const posMap = {}
      ordresOuverts.forEach(o => {
        if (!posMap[o.indice]) posMap[o.indice] = { nbParts: 0, coutTotal: 0 }
        posMap[o.indice].nbParts += Number(o.nb_parts)
        posMap[o.indice].coutTotal += Number(o.nb_parts) * Number(o.pru)
      })

      const actifsEnPF = (actifs || []).filter(a => posMap[a.ticker])
      const prixLive = actifsEnPF.length > 0 ? await getPrixMultiple(actifsEnPF) : {}
      setPrixMap(prixLive)

      let valeurPositions = 0
      const positionsArr = Object.entries(posMap).map(([indice, p]) => {
        const prix = prixLive[indice]
        const valeur = prix ? p.nbParts * prix : p.coutTotal
        const pruMoyen = p.nbParts > 0 ? p.coutTotal / p.nbParts : 0
        const gainEuros = prix ? (prix - pruMoyen) * p.nbParts : 0
        const gainPct = pruMoyen > 0 && prix ? ((prix - pruMoyen) / pruMoyen) * 100 : 0
        valeurPositions += valeur
        return { indice, nbParts: p.nbParts, pruMoyen, prix, valeur, gainEuros, gainPct }
      })

      const valeurPF = liquidites + valeurPositions

      setStats({ totalInjecte, liquidites, valeurPF, gainNet, gainPct })
      setPositions(positionsArr.filter(p => p.nbParts > 0.0001))
      setInjRaw(injections || [])
      setVentesRaw(ventes || [])
      setOrdresAllRaw(ordres || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // Sauvegarde watchlist + fetch données
  useEffect(() => {
    localStorage.setItem('pea_watchlist', JSON.stringify(watchlist))
    if (watchlist.length === 0) { setWatchData({}); return }
    getPrixMultipleDetail(watchlist).then(setWatchData)
  }, [watchlist])

  async function openBubble(ticker) {
    setSelectedBubble(ticker)
    setBubbleHistory([])
    setBubbleLoading(true)
    const detail = await getPrixDetail(ticker, '1mo')
    setBubbleHistory(detail.history || [])
    setBubbleLoading(false)
  }

  function addToWatchlist() {
    const t = window.prompt('Ticker Yahoo Finance (ex: AIR.PA, ^FCHI, BTC-EUR)')
    if (t?.trim()) setWatchlist(prev => [...prev, t.trim().toUpperCase()])
  }

  function removeFromWatchlist(ticker) {
    setWatchlist(prev => prev.filter(t => t !== ticker))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const prenom = user?.user_metadata?.full_name?.split(' ')[0] || user?.email || ''
  const photo = user?.user_metadata?.avatar_url
  const gainCol = gainColor(stats?.gainNet || 0)

  // Sparkline capital
  const sparkData = injRaw.reduce((acc, inj) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].valeur : 0
    acc.push({ date: inj.date, valeur: prev + Number(inj.montant) })
    return acc
  }, [])

  // Graphique ordres empilé
  const ordresChartData = [...ordresAllRaw]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(o => {
      const prixTTC = Number(o.nb_parts) * Number(o.pru) + Number(o.frais)
      let plusvalue = 0, pct = 0
      if (o.statut === 'vendu' && o.pct_realise != null) {
        pct = Number(o.pct_realise)
        plusvalue = (pct / 100) * prixTTC
      } else if (isOuvert(o) && prixMap[o.indice]) {
        plusvalue = (prixMap[o.indice] - Number(o.pru)) * Number(o.nb_parts)
        pct = prixTTC > 0 ? (plusvalue / prixTTC) * 100 : 0
      }
      const baseVal = Math.max(0, prixTTC + Math.min(0, plusvalue))
      const gainVal = Math.max(0, plusvalue)
      const lossVal = Math.max(0, -plusvalue)
      const d = new Date(o.date + 'T00:00:00')
      return {
        label: `${o.indice} ${MOIS[d.getMonth()]}`,
        indice: o.indice,
        date: d.toLocaleDateString('fr-FR'),
        investi: prixTTC,
        plusvalue, pct, baseVal, gainVal, lossVal,
      }
    })

  const ordreChartW = Math.max(ordresChartData.length * 64, 280)

  // Mouvements récents
  const mouvements = [
    ...ordresAllRaw.map(o => ({
      date: o.date, type: 'ACHAT',
      description: `${fmtM(o.nb_parts, 4)} parts ${o.indice} à ${fmtM(o.pru, 4)} €`,
      montant: Number(o.nb_parts) * Number(o.pru) + Number(o.frais),
    })),
    ...injRaw.map(i => ({
      date: i.date, type: i.type === 'dividende' ? 'DIVIDENDE' : 'INJECTION',
      description: `Virement ${fmtM(Number(i.montant))} €`,
      montant: Number(i.montant),
    })),
    ...ventesRaw.map(v => ({
      date: v.date, type: 'VENTE',
      description: `${fmtM(v.nb_parts, 4)} parts ${v.indice} à ${fmtM(v.prix_vente, 4)} €`,
      montant: Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  const TYPE_BADGE = {
    ACHAT: { background: 'rgba(58,123,213,0.2)', border: '1px solid #3a7bd5', color: '#3a7bd5' },
    VENTE: { background: 'rgba(160,74,74,0.2)', border: '1px solid #a04a4a', color: '#a04a4a' },
    INJECTION: { background: 'rgba(42,154,90,0.2)', border: '1px solid #2a9a5a', color: '#2a9a5a' },
    DIVIDENDE: { background: 'rgba(240,192,64,0.2)', border: '1px solid #f0c040', color: '#f0c040' },
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-4 md:px-8 pt-10 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Bonjour</p>
            <h1 className="text-text-primary font-black text-xl tracking-tight mt-0.5">{prenom}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSignOut} className="font-mono text-[9px] uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors" style={{ minHeight: 44, minWidth: 44 }}>
              Sortir
            </button>
            {photo
              ? <img src={photo} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
              : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: BLEU }}>{prenom?.[0]?.toUpperCase()}</div>
            }
          </div>
        </div>

        {/* Carte hero */}
        <div className="rounded-card p-6 mb-4" style={HERO}>
          <Label>Valeur du portefeuille</Label>
          <p className="text-[32px] md:text-[40px] font-black tracking-tight text-text-primary">
            {loading ? '—' : fmt(stats?.valeurPF)}
          </p>
          {!loading && sparkData.length > 1 && (
            <div style={{ marginTop: 12, height: 60 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line type="monotone" dataKey="valeur" stroke={BLEU} strokeWidth={2} dot={false} />
                  <Tooltip
                    contentStyle={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 6, fontSize: 11 }}
                    formatter={val => [fmtM(val) + ' €', 'Capital']}
                    labelFormatter={label => label}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <Label>Total injecté</Label>
            <p className="text-[22px] font-black tracking-tight text-text-primary">{loading ? '—' : fmt(stats?.totalInjecte)}</p>
          </Card>
          <Card>
            <Label>Liquidités dispo</Label>
            <p className="text-[22px] font-black tracking-tight text-text-primary">{loading ? '—' : fmt(stats?.liquidites)}</p>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <Label>Gain net</Label>
            <p className="text-[22px] font-black tracking-tight" style={{ color: gainCol }}>
              {loading ? '—' : fmt(stats?.gainNet)}
            </p>
            {!loading && stats?.totalInjecte > 0 && (
              <p className="text-sm font-bold mt-0.5" style={{ color: gainCol }}>{fmtPct(stats?.gainPct)}</p>
            )}
          </Card>
        </div>

        {/* ── Graphique Mes ordres ── */}
        {!loading && ordresChartData.length > 0 && (
          <div style={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p className="font-mono uppercase text-[9px] tracking-[2px] mb-4" style={{ color: '#3a5080' }}>Mes ordres</p>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: ordreChartW, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordresChartData} barSize={40} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#3a5080', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#3a5080', fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip content={<OrdreTooltip />} />
                    <Bar dataKey="baseVal" stackId="a" fill={BLEU} radius={[0, 0, 0, 0]} name="investi" />
                    <Bar dataKey="gainVal" stackId="a" fill={VERT} radius={[3, 3, 0, 0]} name="gain" />
                    <Bar dataKey="lossVal" stackId="a" fill={ROUGE} radius={[3, 3, 0, 0]} name="perte" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Bulles watchlist ── */}
        <div style={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p className="font-mono uppercase text-[9px] tracking-[2px] mb-4" style={{ color: '#3a5080' }}>Suivi des indices</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {watchlist.map(ticker => {
              const d = watchData[ticker] || {}
              const { price, change } = d
              const borderColor = change > 0 ? '#1a3a2a' : change < 0 ? '#3a1a1a' : '#1a1a3a'
              return (
                <div
                  key={ticker}
                  onClick={() => openBubble(ticker)}
                  style={{ background: '#07071a', border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 14px', position: 'relative', cursor: 'pointer', minHeight: 80 }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); removeFromWatchlist(ticker) }}
                    style={{ position: 'absolute', top: 6, right: 8, color: '#3a5080', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', lineHeight: 1, minHeight: 24, minWidth: 24 }}
                  >×</button>
                  <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 12, marginBottom: 4, paddingRight: 16 }}>{ticker.replace('.PA', '')}</div>
                  <div style={{ color: '#c8e0ff', fontWeight: 800, fontSize: 18 }}>
                    {price != null ? fmtM(price) + ' €' : '—'}
                  </div>
                  {change != null ? (
                    <div style={{ color: change >= 0 ? VERT : ROUGE, fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                      {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} %
                    </div>
                  ) : (
                    <div style={{ color: '#3a5080', fontSize: 12, marginTop: 2 }}>— %</div>
                  )}
                </div>
              )
            })}
            <div
              onClick={addToWatchlist}
              style={{ border: '1px dashed #2a3a5a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80, cursor: 'pointer', color: '#3a5080', fontSize: 28, fontWeight: 300 }}
            >+</div>
          </div>
        </div>

        {/* ── Mes positions ── */}
        <div className="mb-4">
          <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted mb-3">Mes positions</p>
          {loading ? (
            <Card><p className="text-text-muted text-sm">Chargement…</p></Card>
          ) : positions.length === 0 ? (
            <div style={{ background: '#0c0c24', border: '1px dashed #1a1a3a', borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ color: '#c8e0ff', fontWeight: 700, marginBottom: 4 }}>Aucune position ouverte</div>
              <div style={{ color: '#3a5080', fontSize: 13, marginBottom: 16 }}>
                Tes liquidités sont disponibles · {fmtM(stats?.liquidites || 0)} €
              </div>
              <button
                onClick={() => navigate('/ordres')}
                style={{ background: BLEU, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
              >
                + Ajouter un ordre
              </button>
            </div>
          ) : (
            <>
              {/* Mobile : cartes */}
              <div className="md:hidden flex flex-col gap-3">
                {positions.map(p => (
                  <Card key={p.indice} className="flex items-center justify-between">
                    <div>
                      <span style={BADGE}>{p.indice}</span>
                      <p className="text-text-muted text-xs mt-1.5">{fmtM(p.nbParts, 4)} parts</p>
                      {p.prix && <p className="text-text-primary text-sm font-bold mt-0.5">{fmt(p.valeur)}</p>}
                    </div>
                    <div className="text-right">
                      <Label>PRU moyen</Label>
                      <p className="text-text-primary font-bold text-sm">{fmtM(p.pruMoyen, 4)} €</p>
                      {p.prix && (
                        <p className="text-sm font-bold" style={{ color: gainColor(p.gainPct) }}>
                          {p.gainPct >= 0 ? '+' : ''}{p.gainPct.toFixed(2)} %
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop : tableau */}
              <div className="hidden md:block rounded-card" style={{ ...B, backgroundColor: '#0c0c24', overflowX: 'auto' }}>
                <table className="w-full text-sm" style={{ minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Indice', 'Parts', 'PRU moyen', 'Prix live', 'Valeur', 'Gain %', 'Gain €'].map(h => (
                        <th key={h} className="text-left px-5 py-3 font-mono text-[9px] uppercase tracking-[2px] text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p, i) => (
                      <tr key={p.indice} style={{ borderBottom: i < positions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <td className="px-5 py-3"><span style={BADGE}>{p.indice}</span></td>
                        <td className="px-5 py-3 text-text-primary font-medium">{fmtM(p.nbParts, 4)}</td>
                        <td className="px-5 py-3 text-text-primary font-medium">{fmtM(p.pruMoyen, 4)} €</td>
                        <td className="px-5 py-3 text-text-primary font-bold">
                          {p.prix ? fmt(p.prix) : <span style={{ color: '#3a5080' }}>—</span>}
                        </td>
                        <td className="px-5 py-3 text-text-primary font-bold">{fmt(p.valeur)}</td>
                        <td className="px-5 py-3 font-bold" style={{ color: p.prix ? gainColor(p.gainPct) : '#3a5080' }}>
                          {p.prix ? (p.gainPct >= 0 ? '+' : '') + p.gainPct.toFixed(2) + ' %' : '—'}
                        </td>
                        <td className="px-5 py-3 font-bold" style={{ color: p.prix ? gainColor(p.gainEuros) : '#3a5080' }}>
                          {p.prix ? (p.gainEuros >= 0 ? '+' : '') + fmt(p.gainEuros) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ── Derniers mouvements ── */}
        {!loading && mouvements.length > 0 && (
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted mb-3">Derniers mouvements</p>
            <div style={{ background: '#0c0c24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              {mouvements.map((m, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: i < mouvements.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...TYPE_BADGE[m.type], borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.type}</span>
                  <span style={{ color: '#8bb8f0', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR')}</span>
                  <span className="text-text-muted text-xs flex-1 truncate">{m.description}</span>
                  <span style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmtM(m.montant)} €</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal historique bulle ── */}
      {selectedBubble && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setSelectedBubble(null); setBubbleHistory([]) }}
        >
          <div
            style={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 14 }}>{selectedBubble.replace('.PA', '')}</div>
                <div style={{ color: '#c8e0ff', fontWeight: 800, fontSize: 22, marginTop: 2 }}>
                  {watchData[selectedBubble]?.price != null ? fmtM(watchData[selectedBubble].price) + ' €' : '—'}
                  {watchData[selectedBubble]?.change != null && (
                    <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8, color: watchData[selectedBubble].change >= 0 ? VERT : ROUGE }}>
                      {watchData[selectedBubble].change >= 0 ? '▲' : '▼'} {Math.abs(watchData[selectedBubble].change).toFixed(2)} %
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setSelectedBubble(null); setBubbleHistory([]) }}
                style={{ color: '#3a5080', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '2px', color: '#3a5080', marginBottom: 10 }}>Historique 1 mois</p>
            {bubbleLoading ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a5080', fontSize: 13 }}>Chargement…</div>
            ) : bubbleHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={bubbleHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#3a5080', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <Tooltip
                    contentStyle={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 6, fontSize: 11 }}
                    formatter={val => [fmtM(val) + ' €', 'Prix']}
                  />
                  <Line type="monotone" dataKey="prix" stroke={BLEU} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a5080', fontSize: 13 }}>Données insuffisantes</div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
