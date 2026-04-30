import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { userId, statut } = req.body
  if (!userId || !statut) return res.status(400).json({ error: 'userId and statut required' })

  const { error } = await supabase
    .from('profiles')
    .update({
      statut,
      approved_at: statut === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', userId)

  if (error) return res.status(500).json({ error })
  res.status(200).json({ ok: true })
}
