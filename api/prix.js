export default async function handler(req, res) {
  const { ticker, period } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker manquant' })

  const range = period || '1d'
  const interval = range === '1d' ? '1d' : '1d'

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const data = await response.json()

    const result = data?.chart?.result?.[0]
    const price = result?.meta?.regularMarketPrice || null
    const prevClose = result?.meta?.chartPreviousClose || result?.meta?.previousClose || null
    const change = price && prevClose ? ((price - prevClose) / prevClose) * 100 : null

    if (range !== '1d') {
      const timestamps = result?.timestamp || []
      const closes = result?.indicators?.quote?.[0]?.close || []
      const history = timestamps
        .map((t, i) => ({
          date: new Date(t * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          prix: closes[i] != null ? Math.round(closes[i] * 100) / 100 : null,
        }))
        .filter(d => d.prix !== null)

      return res.status(200).json({ price, change, history })
    }

    res.status(200).json({ price, change })
  } catch (err) {
    res.status(500).json({ error: 'erreur fetch' })
  }
}
