export async function getPrixLive(tickerYahoo) {
  try {
    const res = await fetch(`/api/prix?ticker=${encodeURIComponent(tickerYahoo)}`)
    const data = await res.json()
    return data.price
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

export async function getPrixDetail(tickerYahoo, period = '1d') {
  try {
    const res = await fetch(`/api/prix?ticker=${encodeURIComponent(tickerYahoo)}&period=${period}`)
    const data = await res.json()
    return { price: data.price || null, change: data.change ?? null, history: data.history || [] }
  } catch {
    return { price: null, change: null, history: [] }
  }
}

export async function getPrixMultipleDetail(tickers) {
  const results = {}
  await Promise.all(
    tickers.map(async (ticker) => {
      const detail = await getPrixDetail(ticker)
      results[ticker] = detail
    })
  )
  return results
}
