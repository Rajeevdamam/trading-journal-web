import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import EquityCurve from '../components/EquityCurve.jsx'
import Donut from '../components/Donut.jsx'
import TradeCard from '../components/TradeCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { computeStats, fmtMoney, currenciesIn } from '../lib/utils.js'
import emptyDashboardImg from '../assets/empty-states/empty-dashboard.png'
import emptyRecentImg from '../assets/empty-states/empty-recent-trades.png'

export default function Dashboard({ trades, onViewAll, onNewEntry }) {
  if (!trades.length) {
    return (
      <section className="page">
        <div>
          <h2 className="page-title">Analytics &amp; Performance</h2>
          <p className="page-subtitle">Review your trading success and equity growth.</p>
        </div>
        <EmptyState
          illustration={emptyDashboardImg}
          title="Your journal is empty"
          text="Log your first NIFTY, gold or EURUSD trade and this dashboard comes alive — equity curve, win rate, and your trading psychology."
          actionLabel="Log first trade"
          onAction={onNewEntry}
        />
      </section>
    )
  }
  return <DashboardContent trades={trades} onViewAll={onViewAll} />
}

function DashboardContent({ trades, onViewAll }) {
  const currencies = currenciesIn(trades)
  const [picked, setPicked] = useState(null)
  const currency = picked && currencies.includes(picked) ? picked : currencies[0] ?? 'INR'

  // All money widgets show one currency at a time — mixing ₹ and $ sums is meaningless
  const subset = useMemo(
    () => trades.filter((t) => (t.currency ?? 'USD') === currency),
    [trades, currency]
  )
  const stats = computeStats(subset)
  const hasTrades = stats.count > 0

  const longs = subset.filter((t) => t.side === 'LONG').length
  const shorts = subset.length - longs
  const longPct = subset.length ? (longs / subset.length) * 100 : 0

  const recent = [...subset].sort((a, b) => b.ts - a.ts).slice(0, 3)

  return (
    <section className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 className="page-title">Analytics &amp; Performance</h2>
          <p className="page-subtitle">Review your trading success and equity growth.</p>
        </div>
        {currencies.length > 1 && (
          <div className="currency-toggle" role="group" aria-label="Currency">
            {currencies.map((c) => (
              <button key={c} className={currency === c ? 'on' : ''} onClick={() => setPicked(c)}>
                {c === 'INR' ? '₹' : '$'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card hero hero-returns">
        <span className="label" style={{ letterSpacing: '0.14em' }}>
          Total Returns{currencies.length > 1 ? ` · ${currency}` : ''}
        </span>
        <span className={`amount num ${stats.totalReturns >= 0 ? 'pos' : 'neg'}`}>
          {fmtMoney(stats.totalReturns, currency)}
        </span>
        {hasTrades ? (
          <span className={`badge ${stats.weekPnl >= 0 ? 'pos' : 'neg'}`}>
            <Icon name={stats.weekPnl >= 0 ? 'trending_up' : 'trending_down'} size={14} />
            {fmtMoney(stats.weekPnl, currency)} this week
          </span>
        ) : (
          <span className="badge neutral">
            <Icon name="trending_flat" size={14} /> No trades yet
          </span>
        )}
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-head">
            <span style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>Win Rate</span>
            <Icon name="donut_large" size={18} style={{ color: 'var(--primary-container)' }} />
          </div>
          <span className="stat-value num">{hasTrades ? stats.winRate.toFixed(1) + '%' : '—'}</span>
        </div>
        <div className="card stat-card">
          <div className="stat-head">
            <span style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>Profit Factor</span>
            <Icon name="balance" size={18} style={{ color: 'var(--primary-container)' }} />
          </div>
          <span className="stat-value num">
            {hasTrades ? (stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)) : '—'}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="section-title">Equity Curve</h3>
            <span className="label" style={{ color: 'var(--tertiary)' }}>Cumulative P&amp;L ({currency})</span>
          </div>
          {stats.count >= 2 && (
            <span className={`badge ${stats.totalReturns >= 0 ? 'pos' : 'neg'}`}>
              <Icon name={stats.totalReturns >= 0 ? 'trending_up' : 'trending_down'} size={14} />
              {fmtMoney(stats.totalReturns, currency, 0).replace(/^[+-]/, '')}
            </span>
          )}
        </div>
        <EquityCurve trades={subset} positive={stats.totalReturns >= 0} />
      </div>

      <div className="card">
        <h3 className="section-title" style={{ marginBottom: 16 }}>Position Mix</h3>
        <div className="donut-wrap">
          {hasTrades ? (
            <>
              <Donut
                segments={[
                  { deg: (longs / subset.length) * 360, color: '#00d09c' },
                  { deg: (shorts / subset.length) * 360, color: '#ffb4ab' },
                ]}
                centerTop={`${longPct.toFixed(0)}%`}
                centerBottom="Long"
              />
              <div className="legend">
                <div className="legend-row">
                  <span className="legend-key">
                    <span className="legend-dot" style={{ background: '#00d09c' }} />Long
                  </span>
                  <span className="muted">{longs} ({longPct.toFixed(0)}%)</span>
                </div>
                <div className="legend-row">
                  <span className="legend-key">
                    <span className="legend-dot" style={{ background: '#ffb4ab' }} />Short
                  </span>
                  <span className="muted">{shorts} ({(100 - longPct).toFixed(0)}%)</span>
                </div>
              </div>
            </>
          ) : (
            <Donut segments={[]} centerTop="—" centerBottom="No data" />
          )}
        </div>
      </div>

      <div style={{ paddingBottom: 8 }}>
        <div className="list-head">
          <h3 className="section-title">Recent Trades</h3>
          <button className="link-btn" onClick={onViewAll}>VIEW ALL</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recent.length ? (
            recent.map((t) => <TradeCard key={t.id} trade={t} expandable={false} showDay />)
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 0' }}>
              <img src={emptyRecentImg} alt="" style={{ width: 120, height: 120, borderRadius: 12, opacity: 0.7 }} />
              <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>No trades logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
