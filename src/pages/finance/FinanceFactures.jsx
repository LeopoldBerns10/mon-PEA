import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/PageWrapper'

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

export default function FinanceFactures() {
  const [factures, setFactures] = useState([])
  const [modal, setModal] = useState(null) // null | { mode: 'add' | 'edit', item? }
  const [form, setForm] = useState({ nom: '', montant: '', categorie: 'facture', actif: true })

  useEffect(() => { fetchFactures() }, [])

  async function fetchFactures() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('factures_fixes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setFactures(data || [])
  }

  function openAdd() {
    setForm({ nom: '', montant: '', categorie: 'facture', actif: true })
    setModal({ mode: 'add' })
  }

  function openEdit(item) {
    setForm({ ...item })
    setModal({ mode: 'edit', item })
  }

  async function saveForm() {
    const { data: { user } } = await supabase.auth.getUser()
    if (modal.mode === 'add') {
      await supabase.from('factures_fixes').insert({
        user_id: user.id,
        nom: form.nom,
        montant: parseFloat(form.montant),
        categorie: form.categorie,
        actif: form.actif,
      })
    } else {
      await supabase.from('factures_fixes').update({
        nom: form.nom,
        montant: parseFloat(form.montant),
        categorie: form.categorie,
        actif: form.actif,
      }).eq('id', modal.item.id)
    }
    setModal(null)
    fetchFactures()
  }

  async function deleteFacture(id) {
    if (!confirm('Supprimer cette facture fixe ?')) return
    await supabase.from('factures_fixes').delete().eq('id', id)
    fetchFactures()
  }

  async function toggleActif(item) {
    await supabase.from('factures_fixes').update({ actif: !item.actif }).eq('id', item.id)
    fetchFactures()
  }

  const total = factures.filter(f => f.actif).reduce((s, f) => s + Number(f.montant), 0)

  return (
    <PageWrapper>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 18 }}>Factures fixes</div>
          <button
            onClick={openAdd}
            style={{ background: '#3a7bd5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Ajouter
          </button>
        </div>

        {/* Total actives */}
        <div style={{
          background: '#0c0c24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ color: '#3a5080', fontSize: 13 }}>Total mensuel (actives)</div>
          <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 17 }}>{fmt(total)} €</div>
        </div>

        {factures.length === 0 ? (
          <div style={{
            background: '#0c0c24',
            border: '1px dashed #1a1a3a',
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            <div style={{ color: '#c8e0ff', fontWeight: 700, marginBottom: 8 }}>Aucune facture fixe</div>
            <div style={{ color: '#3a5080', fontSize: 13 }}>Ajoute tes charges récurrentes (loyer, abonnements...)</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {factures.map(f => (
              <div key={f.id} style={{
                background: '#0c0c24',
                border: `1px solid ${f.actif ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: f.actif ? 1 : 0.5,
              }}>
                {/* Toggle actif */}
                <button
                  onClick={() => toggleActif(f)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: f.actif ? '#3a7bd5' : '#1a1a3a',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: f.actif ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                  }} />
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{ color: '#c8e0ff', fontWeight: 600, fontSize: 14 }}>{f.nom}</div>
                  <div style={{ color: '#3a5080', fontSize: 12 }}>{f.categorie}</div>
                </div>

                <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 15 }}>{fmt(f.montant)} €</div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>✏️</button>
                  <button onClick={() => deleteFacture(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>🗑️</button>
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
              {modal.mode === 'add' ? '+ Facture fixe' : 'Modifier la facture'}
            </div>
            <input
              placeholder="Nom (ex: Loyer, Netflix...)"
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              style={INPUT_STYLE}
            />
            <input
              placeholder="Montant mensuel (€)"
              type="number"
              value={form.montant}
              onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
              style={INPUT_STYLE}
            />
            <input
              placeholder="Catégorie (ex: logement, abonnement...)"
              value={form.categorie}
              onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              style={INPUT_STYLE}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => setForm(f => ({ ...f, actif: !f.actif }))}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: form.actif ? '#3a7bd5' : '#1a1a3a',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: form.actif ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                }} />
              </button>
              <span style={{ color: '#c8e0ff', fontSize: 14 }}>{form.actif ? 'Active' : 'Inactive'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
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
