import { useMemo } from 'react'
import { pnl } from '../lib/utils.js'

export default function EquityCurve({ trades, positive }) {
  const { linePath, fillPath } = useMemo(() => {
    const sorted = [...trades].sort((a, b) => a.ts - b.ts)
    let cum = 0
    const points = sorted.map((t) => (cum += pnl(t)))
    if (points.length < 2) return { linePath: '', fillPath: '' }

    const min = Math.min(0, ...points)
    const max = Math.max(0, ...points)
    const range = max - min || 1
    const w = 300
    const h = 120
    const pad = 6
    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2))
    const ys = points.map((p) => h - pad - ((p - min) / range) * (h - pad * 2))

    let path = `M ${xs[0]},${ys[0]}`
    for (let i = 1; i < xs.length; i++) {
      const mx = (xs[i - 1] + xs[i]) / 2
      path += ` C ${mx},${ys[i - 1]} ${mx},${ys[i]} ${xs[i]},${ys[i]}`
    }
    return {
      linePath: path,
      fillPath: `${path} L ${xs[xs.length - 1]},${h} L ${xs[0]},${h} Z`,
    }
  }, [trades])

  if (!linePath) {
    return <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>Log a few trades to see your equity curve.</p>
  }

  const stroke = positive ? '#00d09c' : '#ffb4ab'
  return (
    <svg className="equity-svg" viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-label="Equity curve chart">
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={120 * f} x2="300" y2={120 * f} stroke="rgba(51,59,77,0.5)" strokeWidth="0.5" />
      ))}
      <path d={fillPath} fill="url(#eqGrad)" stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
