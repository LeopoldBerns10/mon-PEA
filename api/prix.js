export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker manquant' })

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })
    const data = await response.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    res.status(200).json({ price: price || null })
  } catch (err) {
    res.status(500).json({ error: 'erreur fetch' })
  }
}
