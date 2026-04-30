export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, to, nom } = req.body
  const RESEND_KEY = process.env.RESEND_API_KEY

  if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })

  let subject, html

  if (type === 'approved') {
    subject = '✅ Votre accès Mon PEA a été approuvé'
    html = `
      <div style="font-family:sans-serif;background:#060611;color:#c8e0ff;padding:32px;border-radius:12px;max-width:480px;margin:auto">
        <h2 style="color:#c8e0ff;margin-top:0">Bienvenue ${nom} !</h2>
        <p style="color:#8bb8f0">Votre demande d'accès à <strong>Mon PEA</strong> a été approuvée.</p>
        <a href="https://mon-pea-web.vercel.app" style="background:#3a7bd5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:700">
          Accéder à l'app →
        </a>
      </div>
    `
  } else if (type === 'new_request') {
    subject = '🔔 Nouvelle demande d\'accès Mon PEA'
    html = `
      <div style="font-family:sans-serif;background:#060611;color:#c8e0ff;padding:32px;border-radius:12px;max-width:480px;margin:auto">
        <h2 style="color:#c8e0ff;margin-top:0">Nouvelle demande d'accès</h2>
        <p style="color:#8bb8f0"><strong style="color:#c8e0ff">${nom}</strong> (${to}) souhaite accéder à Mon PEA.</p>
        <a href="https://mon-pea-web.vercel.app/admin" style="background:#3a7bd5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:700">
          Gérer les accès →
        </a>
      </div>
    `
  } else {
    return res.status(400).json({ error: 'Unknown type' })
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Mon PEA <noreply@monpea.app>',
      to: type === 'new_request' ? ['leopoldberns10@gmail.com'] : [to],
      subject,
      html,
    }),
  })

  const data = await response.json()
  res.status(200).json({ ok: true, data })
}
