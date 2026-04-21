import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtPct(val) {
  const n = Number(val || 0)
  return (n >= 0 ? '+' : '') + n.toFixed(2) + ' %'
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-bg-card border border-border rounded-card p-5 ${className}`}>
      {children}
    </div>
  )
}

function StatLabel({ children }) {
  return <p className="text-text-muted text-[10px] uppercase tracking-[2px] font-medium mb-2">{children}</p>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [{ data: injections }, { data: ordres }, { data: ventes }] = await Promise.all([
        supabase.from('injections').select('montant'),
        supabase.from('ordres').select('indice, nb_parts, pru, prix_ttc, frais'),
        supabase.from('ventes').select('indice, nb_parts, prix_vente, frais'),
      ])

      const totalInjecte = (injections || []).reduce((s, r) => s + Number(r.montant), 0)

      const totalAchats = (ordres || []).reduce((s, r) => s + Number(r.prix_ttc), 0)
      const totalProdVentes = (ventes || []).reduce((s, r) => s + Number(r.nb_parts) * Number(r.prix_vente) - Number(r.frais), 0)
      const totalInvesti = totalAchats - totalProdVentes

      const liquidites = totalInjecte - totalInvesti
      const valeurPF = liquidites
      const gainNet = liquidites - totalInjecte
      const gainPct = totalInjecte > 0 ? (gainNet / totalInjecte) * 100 : 0

      setStats({ totalInjecte, totalInvesti, liquidites, valeurPF, gainNet, gainPct })

      // Positions : parts restantes par indice
      const partsAchetees = {}
      const coutTotal = {}
      ;(ordres || []).forEach((o) => {
        partsAchetees[o.indice] = (partsAchetees[o.indice] || 0) + Number(o.nb_parts)
        coutTotal[o.indice] = (coutTotal[o.indice] || 0) + Number(o.nb_parts) * Number(o.pru)
      })
      const partsVendues = {}
      ;(ventes || []).forEach((v) => {
        partsVendues[v.indice] = (partsVendues[v.indice] || 0) + Number(v.nb_parts)
      })

      const pos = Object.keys(partsAchetees)
        .map((indice) => {
          const restantes = partsAchetees[indice] - (partsVendues[indice] || 0)
          const pruMoyen = partsAchetees[indice] > 0 ? coutTotal[indice] / partsAchetees[indice] : 0
          return { indice, restantes, pruMoyen }
        })
        .filter((p) => p.restantes > 0.0001)

      setPositions(pos)
      setLoading(false)
    }
    fetchData()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const prenom = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || ''
  const photo = user?.user_metadata?.avatar_url

  const gainPositif = stats && stats.gainNet >= 0

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-6">
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-[2px]">Bonjour</p>
          <h1 className="text-text-primary text-lg font-bold mt-0.5">{prenom}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSignOut}
            className="text-text-muted text-[11px] uppercase tracking-widest hover:text-text-primary transition-colors"
          >
            Sortir
          </button>
          {photo
            ? <img src={photo} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
            : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: '#3a7bd5' }}>
                {prenom?.[0]?.toUpperCase() || '?'}
              </div>
            )
          }
        </div>
      </div>

      {/* Cartes */}
      <div className="flex flex-col gap-4 px-5 pb-32">
        {/* Valeur portefeuille */}
        <Card>
          <StatLabel>Valeur du portefeuille</StatLabel>
          <p className="text-[28px] font-bold text-text-primary">
            {loading ? '—' : fmt(stats?.valeurPF)}
          </p>
        </Card>

        {/* Total injecté + Liquidités */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <StatLabel>Total injecté</StatLabel>
            <p className="text-[20px] font-bold text-text-primary">{loading ? '—' : fmt(stats?.totalInjecte)}</p>
          </Card>
          <Card>
            <StatLabel>Liquidités dispo</StatLabel>
            <p className="text-[20px] font-bold text-text-primary">{loading ? '—' : fmt(stats?.liquidites)}</p>
          </Card>
        </div>

        {/* Gain net */}
        <Card>
          <StatLabel>Gain net</StatLabel>
          <p className="text-[22px] font-bold" style={{ color: gainPositif ? '#4a9a6a' : '#a04a4a' }}>
            {loading ? '—' : fmt(stats?.gainNet)}
          </p>
          {!loading && stats?.totalInjecte > 0 && (
            <p className="text-sm mt-1" style={{ color: gainPositif ? '#4a9a6a' : '#a04a4a' }}>
              {fmtPct(stats?.gainPct)}
            </p>
          )}
        </Card>

        {/* Mes positions */}
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-[2px] font-medium mb-3 px-1">Mes positions</p>
          {loading ? (
            <Card><p className="text-text-muted text-sm">Chargement…</p></Card>
          ) : positions.length === 0 ? (
            <Card><p className="text-text-muted text-sm">Aucune position ouverte</p></Card>
          ) : (
            <div className="flex flex-col gap-3">
              {positions.map((p) => (
                <Card key={p.indice} className="flex items-center justify-between">
                  <div>
                    <p className="text-text-primary font-bold">{p.indice}</p>
                    <p className="text-text-muted text-xs mt-0.5">{p.restantes.toFixed(4)} parts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest mb-0.5">PRU moyen</p>
                    <p className="text-text-primary font-semibold text-sm">
                      {Number(p.pruMoyen).toLocaleString('fr-FR', { minimumFractionDigits: 4 })} €
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
