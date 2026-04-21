export async function getPrixLive(tickerYahoo) {
  try {
    const res = await fetch(`/api/prix?ticker=${tickerYahoo}`)
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
