import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/PageWrapper'

const TYPE_LABELS = {
  livret: '💳 Livret',
  compte: '🏦 Compte',
  assurance_vie: '🛡️ Assurance vie',
  pea: '📈 PEA',
  autre: '📦 Autre',
}

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const INPUT_STYLE = {
  width: '100%',
  background: '#060611',
  border: '1px solid #1a1a3a',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#c8e0ff',
  fontSize: 14,
  marginBottom: 10,
  boxSizing: 'border-box',
}

export default function FinancePlacements() {
  const navigate = useNavigate()
  const [placements, setPlacements] = useState([])
  const [peaLiquidites, setPeaLiquidites] = useState(0)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nom: '', type: 'livret', solde: '', taux: '', mis_a_jour: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    fetchPlacements()
    fetchPeaLiquidites()
  }, [])

  async function fetchPlacements() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('placements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPlacements(data || [])
  }

  async function fetchPeaLiquidites() {
    const { data: { user } } = await supabase.auth.getUser()

    const [injRes, ordRes, venRes] = await Promise.all([
      supabase.from('injections').select('montant').eq('user_id', user.id),
      supabase.from('ordres').select('nb_parts, pru, frais').eq('user_id', user.id),
      supabase.from('ventes').select('nb_parts, prix_vente_reel, frais_vente').eq('user_id', user.id),
    ])

    const totalInjecte = (injRes.data || []).reduce((s, i) => s + Number(i.montant), 0)
    const totalDepense = (ordRes.data || []).reduce((s, o) => s + Number(o.nb_parts) * Number(o.pru) + Number(o.frais), 0)
    const totalRecupere = (venRes.data || []).reduce((s, v) => s + Number(v.nb_parts) * Number(v.prix_vente_reel) - Number(v.frais_vente || 0), 0)

    setPeaLiquidites(totalInjecte - totalDepense + totalRecupere)
  }

  function openAdd() {
    setForm({ nom: '', type: 'livret', solde: '', taux: '', mis_a_jour: new Date().toISOString().split('T')[0] })
    setModal({ mode: 'add' })
  }

  function openEdit(item) {
    setForm({
      nom: item.nom,
      type: item.type,
      solde: item.solde,
      taux: item.taux || '',
      mis_a_jour: item.mis_a_jour || new Date().toISOString().split('T')[0],
    })
    setModal({ mode: 'edit', item })
  }

  async function saveForm() {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      user_id: user.id,
      nom: form.nom,
      type: form.type,
      solde: parseFloat(form.solde) || 0,
      taux: form.taux ? parseFloat(form.taux) : null,
      mis_a_jour: form.mis_a_jour || null,
    }
    if (modal.mode === 'add') {
      await supabase.from('placements').insert(payload)
    } else {
      await supabase.from('placements').update(payload).eq('id', modal.item.id)
    }
    setModal(null)
    fetchPlacements()
  }

  async function deletePlacement(id) {
    if (!confirm('Supprimer ce placement ?')) return
    await supabase.from('placements').delete().eq('id', id)
    fetchPlacements()
  }

  const totalPlacements = placements.reduce((s, p) => s + Number(p.solde), 0)
  const patrimoineTotal = totalPlacements + Math.max(0, peaLiquidites)

  return (
    <PageWrapper>
      {/* Bandeau patrimoine sticky */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: '#07071a',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 20px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#3a5080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 }}>Patrimoine total</div>
        <div style={{ color: '#f0c040', fontWeight: 800, fontSize: 28 }}>{fmt(patrimoineTotal)} €</div>
      </div>

      <div style={{ maxWidth: 430, margin: '0 auto', padding: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 18 }}>Mes placements</div>
          <button
            onClick={openAdd}
            style={{ background: '#3a7bd5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Ajouter
          </button>
        </div>

        {/* Carte PEA auto */}
        <div style={{
          background: '#0c0c24',
          border: '1px solid rgba(58,123,213,0.3)',
          borderRadius: 14,
          padding: '18px 16px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 15 }}>Mon PEA</div>
            <span style={{ background: '#1e3a6e', color: '#5a9aee', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>AUTO</span>
          </div>
          <div style={{ color: '#3a7bd5', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>{fmt(Math.max(0, peaLiquidites))} €</div>
          <div style={{ color: '#3a5080', fontSize: 12, marginBottom: 12 }}>Liquidités disponibles sur PEA</div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#3a7bd5', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            Voir le détail →
          </button>
        </div>

        {/* Liste placements */}
        {placements.length === 0 ? (
          <div style={{
            background: '#0c0c24',
            border: '1px dashed #1a1a3a',
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <div style={{ color: '#c8e0ff', fontWeight: 700, marginBottom: 8 }}>Aucun placement ajouté</div>
            <div style={{ color: '#3a5080', fontSize: 13 }}>Ajoute tes livrets, comptes épargne et assurances vie</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {placements.map(p => (
              <div key={p.id} style={{
                background: '#0c0c24',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: '16px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 15 }}>{p.nom}</div>
                    <span style={{ background: '#1a1a3a', color: '#3a5080', fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 8px', marginTop: 4, display: 'inline-block' }}>
                      {TYPE_LABELS[p.type] || p.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>✏️</button>
                    <button onClick={() => deletePlacement(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>🗑️</button>
                  </div>
                </div>
                <div style={{ color: '#2a9a5a', fontWeight: 800, fontSize: 24 }}>{fmt(p.solde)} €</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  {p.taux != null && (
                    <div style={{ color: '#3a5080', fontSize: 12 }}>Taux : <span style={{ color: '#f0c040' }}>{p.taux}%</span></div>
                  )}
                  {p.mis_a_jour && (
                    <div style={{ color: '#3a5080', fontSize: 12 }}>
                      MàJ : {new Date(p.mis_a_jour).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0c0c24', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 430 }}
          >
            <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              {modal.mode === 'add' ? '+ Nouveau placement' : 'Modifier le placement'}
            </div>
            <input placeholder="Nom (ex: Livret A, CEL...)" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={INPUT_STYLE} />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={INPUT_STYLE}>
              <option value="livret">💳 Livret</option>
              <option value="compte">🏦 Compte épargne</option>
              <option value="assurance_vie">🛡️ Assurance vie</option>
              <option value="autre">📦 Autre</option>
            </select>
            <input placeholder="Solde actuel (€)" type="number" value={form.solde} onChange={e => setForm(f => ({ ...f, solde: e.target.value }))} style={INPUT_STYLE} />
            <input placeholder="Taux annuel % (optionnel)" type="number" step="0.01" value={form.taux} onChange={e => setForm(f => ({ ...f, taux: e.target.value }))} style={INPUT_STYLE} />
            <input type="date" value={form.mis_a_jour} onChange={e => setForm(f => ({ ...f, mis_a_jour: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, background: '#1a1a3a', border: 'none', borderRadius: 8, padding: '12px', color: '#3a5080', fontSize: 14, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={saveForm} style={{ flex: 2, background: '#3a7bd5', border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {modal.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
