import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'
import { getPrixMultiple } from '../services/prixLive'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const B = { border: '1px solid rgba(255,255,255,0.12)' }
const HERO = { background: 'linear-gradient(135deg,#0d1b3e,#0c0c24)', border: '1px solid #2a4a8a', boxShadow: '0 0 24px rgba(58,123,213,0.15)' }
const BADGE = { background: '#0d2040', border: '1px solid #1e3a6e', color: '#f0c040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtPct(val) {
  const n = Number(val || 0)
  return (n >= 0 ? '+' : '') + n.toFixed(2) + ' %'
}
function fmtNum(val, dec = 4) {
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

function gainColor(val) { return val >= 0 ? '#2a9a5a' : '#a04a4a' }
function isOuvert(o) { return !o.statut || o.statut === 'ouvert' }

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [{ data: injections }, { data: ordres }, { data: ventes }, { data: actifs }] = await Promise.all([
        supabase.from('injections').select('date, montant, type').order('date', { ascending: true }),
        supabase.from('ordres').select('date, indice, nb_parts, pru, frais, statut').order('date', { ascending: false }),
        supabase.from('ventes').select('date, indice, nb_parts, prix_vente, frais, gain_euros, gain_pct').order('date', { ascending: false }),
        supabase.from('actifs').select('ticker, ticker_yahoo'),
      ])

      const totalInjecte = (injections || []).reduce((s, r) => s + Number(r.montant), 0)

      // SUM(prix_ttc) de TOUS les ordres (ouverts ET vendus)
      const totalDepense = (ordres || []).reduce(
        (s, o) => s + Number(o.nb_parts) * Number(o.pru) + Number(o.frais), 0
      )
      // Ordres ouverts pour les positions uniquement
      const ordresOuverts = (ordres || []).filter(isOuvert)

      // SUM(montant_recupere) des ventes = nb_parts * prix_vente - frais
      const totalMontantRecupere = (ventes || []).reduce(
        (s, v) => s + Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais), 0
      )

      // Liquidités = injections - total dépensé (tous ordres) + récupéré (ventes)
      const liquidites = totalInjecte - totalDepense + totalMontantRecupere

      // Gain net = Liquidités - Total injecté
      const gainNet = liquidites - totalInjecte
      const gainPct = totalInjecte > 0 ? (gainNet / totalInjecte) * 100 : 0

      // Build positions map from open orders
      const posMap = {}
      ordresOuverts.forEach(o => {
        if (!posMap[o.indice]) posMap[o.indice] = { nbParts: 0, coutTotal: 0 }
        posMap[o.indice].nbParts += Number(o.nb_parts)
        posMap[o.indice].coutTotal += Number(o.nb_parts) * Number(o.pru)
      })

      // Fetch live prices
      const actifsEnPF = (actifs || []).filter(a => posMap[a.ticker])
      const prixLive = actifsEnPF.length > 0 ? await getPrixMultiple(actifsEnPF) : {}
      setPrixMap(prixLive)

      // Valeur portefeuille = Liquidités + SUM(nb_parts * prix_live)
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const prenom = user?.user_metadata?.full_name?.split(' ')[0] || user?.email || ''
  const photo = user?.user_metadata?.avatar_url
  const gainCol = gainColor(stats?.gainNet || 0)

  const fmtM = (val, dec = 2) => Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

  const sparkData = injRaw.reduce((acc, inj) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].valeur : 0
    acc.push({ date: inj.date, valeur: prev + Number(inj.montant) })
    return acc
  }, [])

  const capitalByMonth = {}
  injRaw.forEach(inj => {
    const d = new Date(inj.date + 'T00:00:00')
    const key = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`
    if (!capitalByMonth[key]) capitalByMonth[key] = 0
    capitalByMonth[key] += Number(inj.montant)
  })
  const capitalMonthsSorted = Object.keys(capitalByMonth).sort((a, b) => {
    const [ma, ya] = a.split('/').map(Number)
    const [mb, yb] = b.split('/').map(Number)
    return (ya * 12 + ma) - (yb * 12 + mb)
  })
  let capitalCumul = 0
  const capitalChartData = capitalMonthsSorted.map(key => {
    capitalCumul += capitalByMonth[key]
    return { mois: key, valeur: Math.round(capitalCumul) }
  })

  const perfByIndice = {}
  ventesRaw.forEach(v => {
    if (!perfByIndice[v.indice]) perfByIndice[v.indice] = { pctSum: 0, count: 0 }
    if (v.gain_pct != null) { perfByIndice[v.indice].pctSum += Number(v.gain_pct); perfByIndice[v.indice].count++ }
  })
  const perfChartData = Object.entries(perfByIndice)
    .map(([indice, d]) => ({ indice, pct: d.count > 0 ? Math.round((d.pctSum / d.count) * 100) / 100 : 0 }))
    .sort((a, b) => a.pct - b.pct)

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
      <div className="w-full max-w-[430px] md:max-w-content mx-auto px-5 md:px-8 pt-10 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted">Bonjour</p>
            <h1 className="text-text-primary font-black text-xl tracking-tight mt-0.5">{prenom}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSignOut} className="font-mono text-[9px] uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors">
              Sortir
            </button>
            {photo
              ? <img src={photo} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
              : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: '#3a7bd5' }}>{prenom?.[0]?.toUpperCase()}</div>
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
                  <Line type="monotone" dataKey="valeur" stroke="#3a7bd5" strokeWidth={2} dot={false} />
                  <Tooltip
                    contentStyle={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 6, fontSize: 11 }}
                    formatter={(val) => [fmtM(val) + ' €', 'Capital']}
                    labelFormatter={(label) => label}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Stats — 2 cols mobile, 3 cols desktop */}
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

        {/* Graphiques */}
        {!loading && capitalChartData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div style={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 12, padding: 16 }}>
              <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted mb-4">Capital investi dans le temps</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={capitalChartData} barSize={Math.max(8, Math.min(24, Math.floor(180 / Math.max(capitalChartData.length, 1))))}>
                  <CartesianGrid vertical={false} stroke="#1a1a3a" />
                  <XAxis dataKey="mois" tick={{ fill: '#3a5080', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#3a5080', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 6, fontSize: 11 }} formatter={val => [fmtM(val) + ' €', 'Capital cumulé']} />
                  <Bar dataKey="valeur" fill="#3a7bd5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {perfChartData.length > 0 && (
              <div style={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 12, padding: 16 }}>
                <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted mb-4">Performance par actif</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={perfChartData} layout="vertical" barSize={16}>
                    <CartesianGrid horizontal={false} stroke="#1a1a3a" />
                    <XAxis type="number" tick={{ fill: '#3a5080', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v + '%'} />
                    <YAxis type="category" dataKey="indice" tick={{ fill: '#3a5080', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip contentStyle={{ background: '#0c0c24', border: '1px solid #1a1a3a', borderRadius: 6, fontSize: 11 }} formatter={val => [(val >= 0 ? '+' : '') + fmtM(val) + ' %', 'Gain moyen']} />
                    <Bar dataKey="pct" radius={[0, 3, 3, 0]}>
                      {perfChartData.map((entry, i) => <Cell key={i} fill={entry.pct >= 0 ? '#2a9a5a' : '#a04a4a'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Positions */}
        <div>
          <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted mb-3">Mes positions</p>

          {loading ? (
            <Card><p className="text-text-muted text-sm">Chargement…</p></Card>
          ) : positions.length === 0 ? (
            <Card><p className="text-text-muted text-sm">Aucune position ouverte</p></Card>
          ) : (
            <>
              {/* Mobile : cartes */}
              <div className="md:hidden flex flex-col gap-3">
                {positions.map(p => (
                  <Card key={p.indice} className="flex items-center justify-between">
                    <div>
                      <span style={BADGE}>{p.indice}</span>
                      <p className="text-text-muted text-xs mt-1.5">{fmtNum(p.nbParts)} parts</p>
                      {p.prix && <p className="text-text-primary text-sm font-bold mt-0.5">{fmt(p.valeur)}</p>}
                    </div>
                    <div className="text-right">
                      <Label>PRU moyen</Label>
                      <p className="text-text-primary font-bold text-sm">{fmtNum(p.pruMoyen)} €</p>
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
              <div className="hidden md:block rounded-card overflow-hidden" style={{ ...B, backgroundColor: '#0c0c24' }}>
                <table className="w-full text-sm">
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
                        <td className="px-5 py-3 text-text-primary font-medium">{fmtNum(p.nbParts)}</td>
                        <td className="px-5 py-3 text-text-primary font-medium">{fmtNum(p.pruMoyen)} €</td>
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

        {/* Derniers mouvements */}
        {!loading && mouvements.length > 0 && (
          <div className="mt-6">
            <p className="font-mono uppercase text-[9px] tracking-[2px] text-text-muted mb-3">Derniers mouvements</p>
            <div style={{ background: '#0c0c24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              {mouvements.map((m, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: i < mouvements.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ ...TYPE_BADGE[m.type], borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.type}</span>
                  <span style={{ color: '#8bb8f0', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(m.date).toLocaleDateString('fr-FR')}</span>
                  <span className="text-text-muted text-xs flex-1 truncate">{m.description}</span>
                  <span style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmtM(m.montant)} €</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
