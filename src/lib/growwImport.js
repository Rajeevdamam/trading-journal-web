// Parse a Groww "P&L Statement for Futures & Options" (.csv or .xlsx)
// into journal trade objects. The statement is mostly metadata (summary,
// charges, disclaimer); actual trades sit under one or more header rows
// that start with "Scrip Name".

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

// "15 Jun 2026" (sometimes with stray leading tokens like "6 15 Jun 2026")
// -> Date at midnight local, or null if unparseable.
function parseGrowwDate(text) {
  const tokens = String(text ?? '').trim().split(/\s+/)
  if (tokens.length < 3) return null
  const [day, mon, year] = tokens.slice(-3)
  const d = parseInt(day, 10)
  const m = MONTHS[String(mon).slice(0, 3).toLowerCase()]
  let y = parseInt(year, 10)
  if (!d || m == null || Number.isNaN(y)) return null
  if (y < 100) y += 2000
  const date = new Date(y, m, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function toNumber(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// Minimal CSV line splitter with quote support (scrip names have no commas,
// but the account-name row and future format changes might).
function splitCsvLine(line) {
  const cells = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cur += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { cells.push(cur); cur = '' }
    else cur += ch
  }
  cells.push(cur)
  return cells
}

// "NIFTY 16 JUN 26 23900 Call" -> journal symbol. Only NIFTY maps to an
// instrument preset; anything else keeps its underlying name so the trade
// still imports (with generic INR/F&O defaults).
function symbolFromScrip(scrip) {
  const underlying = String(scrip).trim().split(/\s+/)[0].toUpperCase()
  return underlying === 'NIFTY' ? 'NIFTY 50' : underlying
}

// Groww statements only carry dates, not times. Give same-day trades a
// deterministic 45-minute spacing from 09:30 so day grouping is right and
// the emotion inference (which looks at gaps between trades) isn't fooled
// into flagging every same-day pair as revenge trading.
function makeTimestamper() {
  const perDay = new Map()
  return (date) => {
    const key = date.toDateString()
    const i = perDay.get(key) ?? 0
    perDay.set(key, i + 1)
    const ts = new Date(date)
    ts.setHours(9, 30 + i * 45, 0, 0)
    return ts.getTime()
  }
}

function rowsToTrades(rows) {
  const trades = []
  const stamp = makeTimestamper()
  let inTradeSection = false

  for (const row of rows) {
    const cells = row.map((c) => String(c ?? '').trim())
    const first = cells[0] ?? ''

    if (/^scrip\s*name$/i.test(first)) {
      inTradeSection = true
      continue
    }
    if (!inTradeSection) continue
    if (!first || /^disclaimer/i.test(first)) {
      inTradeSection = false
      continue
    }

    // Scrip Name, Quantity, Buy Date, Buy Price, Buy Value, Sell Date, Sell Price, Sell Value, Realized P&L
    const [scrip, qtyRaw, buyDateRaw, buyPriceRaw, buyValueRaw, sellDateRaw, sellPriceRaw, sellValueRaw] = cells
    const size = toNumber(qtyRaw)
    // Prefer Value/Quantity over the price column: Groww's value columns are
    // the true average fills, so journal P&L matches the statement's
    // Realized P&L to the paisa even when the rounded price column doesn't.
    const avg = (valueRaw, priceRaw) => {
      const value = toNumber(valueRaw)
      const price = size ? (value != null ? value / size : null) : null
      return price != null ? Math.round(price * 10000) / 10000 : toNumber(priceRaw)
    }
    const buyPrice = avg(buyValueRaw, buyPriceRaw)
    const sellPrice = avg(sellValueRaw, sellPriceRaw)
    const buyDate = parseGrowwDate(buyDateRaw)
    const sellDate = parseGrowwDate(sellDateRaw)
    if (!scrip || !size || size <= 0 || buyPrice == null || sellPrice == null || !buyDate || !sellDate) {
      continue // section sub-header ("Futures"/"Options"), summary row, or malformed
    }

    // Bought first = LONG; sold first (short option premium) = SHORT
    const isLong = buyDate.getTime() <= sellDate.getTime()
    const openDate = isLong ? buyDate : sellDate

    trades.push({
      ts: stamp(openDate),
      symbol: symbolFromScrip(scrip),
      side: isLong ? 'LONG' : 'SHORT',
      asset: 'INDEX',
      currency: 'INR',
      multiplier: 1,
      entry: isLong ? buyPrice : sellPrice,
      exit: isLong ? sellPrice : buyPrice,
      size,
      notes: '',
      emotionAuto: true,
    })
  }
  return trades
}

/**
 * Parse a Groww P&L statement into journal trade objects (without ids —
 * the store assigns those). CSV text or .xlsx ArrayBuffer.
 */
export async function parseGrowwStatement(fileContent, fileName = '') {
  let rows
  if (/\.xlsx?$/i.test(fileName)) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(fileContent)
    rows = wb.SheetNames.flatMap((name) =>
      XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' })
    )
  } else {
    rows = String(fileContent)
      .split(/\r\n|\n|\r/)
      .map(splitCsvLine)
  }
  return rowsToTrades(rows)
}
