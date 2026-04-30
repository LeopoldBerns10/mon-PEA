import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageWrapper from '../../components/PageWrapper'

const CATEGORIES = [
  { id: 'nourriture',  label: 'Nourriture',  emoji: '🛒' },
  { id: 'essence',     label: 'Essence',      emoji: '⛽' },
  { id: 'loisirs',     label: 'Loisirs',      emoji: '🎮' },
  { id: 'restaurant',  label: 'Restaurant',   emoji: '🍔' },
  { id: 'sante',       label: 'Santé',        emoji: '💊' },
  { id: 'vetements',   label: 'Vêtements',    emoji: '👕' },
  { id: 'transport',   label: 'Transport',    emoji: '🚗' },
  { id: 'autre',       label: 'Autre',        emoji: '📦' },
]

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

export default function FinanceMoisDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mois, setMois] = useState(null)
  const [revenus, setRevenus] = useState([])
  const [factures, setFactures] = useState([])
  const [depenses, setDepenses] = useState([])
  const [versements, setVersements] = useState([])
  const [modal, setModal] = useState(null) // { type, mode, data }
  const [form, setForm] = useState({})

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const [m, r, f, d, v] = await Promise.all([
      supabase.from('mois_finance').select('*').eq('id', id).single(),
      supabase.from('revenus').select('*').eq('mois_id', id).order('created_at'),
      supabase.from('factures_mois').select('*').eq('mois_id', id).order('created_at'),
      supabase.from('depenses').select('*').eq('mois_id', id).order('date', { ascending: false }),
      supabase.from('versements_epargne').select('*').eq('mois_id', id).order('created_at'),
    ])
    setMois(m.data)
    setRevenus(r.data || [])
    setFactures(f.data || [])
    setDepenses(d.data || [])
    setVersements(v.data || [])
  }

  function openAdd(type) {
    const defaults = {
      revenu: { label: '', montant: '' },
      facture: { nom: '', montant_prevu: '', montant_reel: '', paye: false },
      depense: { label: '', montant: '', categorie: 'autre', date: new Date().toISOString().split('T')[0] },
      versement: { destination: '', montant: '' },
    }
    setForm(defaults[type])
    setModal({ type, mode: 'add' })
  }

  function openEdit(type, item) {
    setForm({ ...item })
    setModal({ type, mode: 'edit', data: item })
  }

  async function saveForm() {
    const { data: { user } } = await supabase.auth.getUser()
    const { type, mode, data: item } = modal

    if (mode === 'add') {
      const payload = { user_id: user.id, mois_id: id, ...form }
      if (type === 'revenu') await supabase.from('revenus').insert(payload)
      else if (type === 'facture') await supabase.from('factures_mois').insert(payload)
      else if (type === 'depense') await supabase.from('depenses').insert(payload)
      else if (type === 'versement') await supabase.from('versements_epargne').insert(payload)
    } else {
      const payload = { ...form }
      if (type === 'revenu') await supabase.from('revenus').update(payload).eq('id', item.id)
      else if (type === 'facture') await supabase.from('factures_mois').update(payload).eq('id', item.id)
      else if (type === 'depense') await supabase.from('depenses').update(payload).eq('id', item.id)
      else if (type === 'versement') await supabase.from('versements_epargne').update(payload).eq('id', item.id)
    }
    setModal(null)
    fetchAll()
  }

  async function deleteItem(type, itemId) {
    if (!confirm('Supprimer ?')) return
    if (type === 'revenu') await supabase.from('revenus').delete().eq('id', itemId)
    else if (type === 'facture') await supabase.from('factures_mois').delete().eq('id', itemId)
    else if (type === 'depense') await supabase.from('depenses').delete().eq('id', itemId)
    else if (type === 'versement') await supabase.from('versements_epargne').delete().eq('id', itemId)
    fetchAll()
  }

  async function togglePaye(facture) {
    await supabase.from('factures_mois').update({ paye: !facture.paye }).eq('id', facture.id)
    fetchAll()
  }

  const moisLabel = mois ? new Date(mois.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''

  return (
    <PageWrapper>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => navigate('/finance/mois')}
            style={{ background: 'none', border: 'none', color: '#3a7bd5', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >←</button>
          <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 17, textTransform: 'capitalize' }}>{moisLabel}</div>
        </div>

        {/* Revenus */}
        <Section title="💶 Revenus" onAdd={() => openAdd('revenu')}>
          {revenus.map(r => (
            <LigneItem key={r.id}
              label={r.label}
              montant={`${fmt(r.montant)} €`}
              onEdit={() => openEdit('revenu', r)}
              onDelete={() => deleteItem('revenu', r.id)}
            />
          ))}
        </Section>

        {/* Factures */}
        <Section title="🧾 Factures" onAdd={() => openAdd('facture')}>
          {factures.map(f => (
            <div key={f.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              gap: 8,
            }}>
              <button
                onClick={() => togglePaye(f)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${f.paye ? '#2a9a5a' : '#1a1a3a'}`,
                  background: f.paye ? '#2a9a5a' : 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                }}
              >{f.paye ? '✓' : ''}</button>
              <div style={{ flex: 1 }}>
                <div style={{ color: f.paye ? '#3a5080' : '#c8e0ff', fontSize: 14, textDecoration: f.paye ? 'line-through' : 'none' }}>{f.nom}</div>
                <div style={{ color: '#3a5080', fontSize: 12 }}>
                  Prévu {fmt(f.montant_prevu)} €
                  {f.montant_reel != null ? ` · Réel ${fmt(f.montant_reel)} €` : ''}
                </div>
              </div>
              <BoutonActions onEdit={() => openEdit('facture', f)} onDelete={() => deleteItem('facture', f.id)} />
            </div>
          ))}
        </Section>

        {/* Dépenses */}
        <Section title="🛒 Dépenses" onAdd={() => openAdd('depense')}>
          {depenses.map(d => {
            const cat = CATEGORIES.find(c => c.id === d.categorie)
            return (
              <LigneItem key={d.id}
                label={`${cat?.emoji || '📦'} ${d.label}`}
                sublabel={d.date}
                montant={`${fmt(d.montant)} €`}
                onEdit={() => openEdit('depense', d)}
                onDelete={() => deleteItem('depense', d.id)}
              />
            )
          })}
        </Section>

        {/* Versements */}
        <Section title="💰 Versements épargne" onAdd={() => openAdd('versement')}>
          {versements.map(v => (
            <LigneItem key={v.id}
              label={v.destination}
              montant={`${fmt(v.montant)} €`}
              onEdit={() => openEdit('versement', v)}
              onDelete={() => deleteItem('versement', v.id)}
            />
          ))}
        </Section>
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
              {modal.mode === 'add' ? '+ ' : 'Modifier — '}
              {modal.type === 'revenu' ? 'Revenu' : modal.type === 'facture' ? 'Facture' : modal.type === 'depense' ? 'Dépense' : 'Versement'}
            </div>

            {modal.type === 'revenu' && (
              <>
                <input placeholder="Label" value={form.label || ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={INPUT_STYLE} />
                <input placeholder="Montant (€)" type="number" value={form.montant || ''} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} style={INPUT_STYLE} />
              </>
            )}

            {modal.type === 'facture' && (
              <>
                <input placeholder="Nom" value={form.nom || ''} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={INPUT_STYLE} />
                <input placeholder="Montant prévu (€)" type="number" value={form.montant_prevu || ''} onChange={e => setForm(f => ({ ...f, montant_prevu: e.target.value }))} style={INPUT_STYLE} />
                <input placeholder="Montant réel (€)" type="number" value={form.montant_reel || ''} onChange={e => setForm(f => ({ ...f, montant_reel: e.target.value }))} style={INPUT_STYLE} />
              </>
            )}

            {modal.type === 'depense' && (
              <>
                <input placeholder="Description" value={form.label || ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={INPUT_STYLE} />
                <input placeholder="Montant (€)" type="number" value={form.montant || ''} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} style={INPUT_STYLE} />
                <input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={INPUT_STYLE} />
                <select value={form.categorie || 'autre'} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} style={INPUT_STYLE}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </>
            )}

            {modal.type === 'versement' && (
              <>
                <input placeholder="Destination (ex: Livret A)" value={form.destination || ''} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} style={INPUT_STYLE} />
                <input placeholder="Montant (€)" type="number" value={form.montant || ''} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} style={INPUT_STYLE} />
              </>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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

function Section({ title, onAdd, children }) {
  return (
    <div style={{
      background: '#0c0c24',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ color: '#c8e0ff', fontWeight: 700, fontSize: 14 }}>{title}</div>
        <button
          onClick={onAdd}
          style={{ background: '#1a1a3a', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#3a7bd5', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
        >+</button>
      </div>
      {children}
    </div>
  )
}

function LigneItem({ label, sublabel, montant, onEdit, onDelete }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#c8e0ff', fontSize: 14 }}>{label}</div>
        {sublabel && <div style={{ color: '#3a5080', fontSize: 12 }}>{sublabel}</div>}
      </div>
      <div style={{ color: '#f0c040', fontWeight: 600, fontSize: 14, marginRight: 10 }}>{montant}</div>
      <BoutonActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function BoutonActions({ onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>✏️</button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>🗑️</button>
    </div>
  )
}
