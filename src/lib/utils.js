export function pnl(t) {
  const dir = t.side === 'LONG' ? 1 : -1
  return (t.exit - t.entry) * t.size * (t.multiplier ?? 1) * dir
}

const CURRENCY_SIGN = { INR: '₹', USD: '$' }

export function fmtMoney(v, currency = 'USD', decimals = 2) {
  const sign = v >= 0 ? '+' : '-'
  const symbol = CURRENCY_SIGN[currency] ?? '$'
  return `${sign}${symbol}${Math.abs(v).toLocaleString(currency === 'INR' ? 'en-IN' : undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function fmtPrice(v, decimals = 2) {
  return Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function dayLabel(ts) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today, ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (sameDay(d, yesterday)) return 'Yesterday, ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function monthLabel(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function monthKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}`
}

export function computeStats(trades) {
  const all = [...trades].sort((a, b) => a.ts - b.ts)
  const totalReturns = all.reduce((s, t) => s + pnl(t), 0)
  const wins = all.filter((t) => pnl(t) >= 0).length
  const winRate = all.length ? (wins / all.length) * 100 : 0
  const grossWin = all.filter((t) => pnl(t) > 0).reduce((s, t) => s + pnl(t), 0)
  const grossLoss = Math.abs(all.filter((t) => pnl(t) < 0).reduce((s, t) => s + pnl(t), 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weekPnl = all.filter((t) => t.ts >= weekAgo).reduce((s, t) => s + pnl(t), 0)
  const bestTrade = all.length ? Math.max(...all.map(pnl)) : 0
  return { totalReturns, winRate, profitFactor, weekPnl, bestTrade, count: all.length, wins }
}

// Currencies that actually have trades, INR first.
export function currenciesIn(trades) {
  const set = new Set(trades.map((t) => t.currency ?? 'USD'))
  return ['INR', 'USD'].filter((c) => set.has(c))
}

// [['INR', net], ['USD', net]] for the currencies present.
export function netsByCurrency(trades) {
  return currenciesIn(trades).map((c) => [
    c,
    trades.filter((t) => (t.currency ?? 'USD') === c).reduce((s, t) => s + pnl(t), 0),
  ])
}

export function tradesToCsv(trades) {
  const header = ['Date', 'Time', 'Symbol', 'Side', 'Asset', 'Size', 'Multiplier', 'Currency', 'Entry', 'Exit', 'PnL', 'Emotion', 'Notes']
  const rows = [...trades]
    .sort((a, b) => a.ts - b.ts)
    .map((t) => {
      const d = new Date(t.ts)
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        t.symbol,
        t.side,
        t.asset || 'OTHER',
        t.size,
        t.multiplier ?? 1,
        t.currency ?? 'USD',
        t.entry,
        t.exit,
        pnl(t).toFixed(2),
        t.emotion || 'neutral',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    })
  return [header.join(','), ...rows].join('\n')
}
