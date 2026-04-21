import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'
import { getPrixMultiple } from '../services/prixLive'

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [{ data: injections }, { data: ordres }, { data: ventes }, { data: actifs }] = await Promise.all([
        supabase.from('injections').select('montant'),
        supabase.from('ordres').select('indice, nb_parts, pru, frais, statut'),
        supabase.from('ventes').select('nb_parts, prix_vente, frais'),
        supabase.from('actifs').select('ticker, ticker_yahoo'),
      ])

      const totalInjecte = (injections || []).reduce((s, r) => s + Number(r.montant), 0)

      // SUM(prix_ttc) des ordres ouverts
      const ordresOuverts = (ordres || []).filter(isOuvert)
      const totalPrixTTCOuverts = ordresOuverts.reduce(
        (s, o) => s + Number(o.nb_parts) * Number(o.pru) + Number(o.frais), 0
      )

      // SUM(montant_recupere) des ventes = nb_parts * prix_vente - frais
      const totalMontantRecupere = (ventes || []).reduce(
        (s, v) => s + Number(v.nb_parts) * Number(v.prix_vente) - Number(v.frais), 0
      )

      // Liquidités = injections - prix_ttc_ouverts + montant_recupere_ventes
      const liquidites = totalInjecte - totalPrixTTCOuverts + totalMontantRecupere

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
  const gainPositif = stats?.gainNet >= 0
  const gainCol = gainColor(stats?.gainNet || 0)

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
      </div>
    </PageWrapper>
  )
}
