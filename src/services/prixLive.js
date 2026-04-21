export async function getPrixLive(tickerYahoo) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerYahoo}?interval=1d&range=1d`
    const res = await fetch(url)
    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    return price || null
  } catch {
    return null
  }
}

export async function getPrixMultiple(actifs) {
  const results = {}
  await Promise.all(
    actifs.map(async (a) => {
      const prix = await getPrixLive(a.ticker_yahoo)
      results[a.ticker] = prix
    })
  )
  return results
}
