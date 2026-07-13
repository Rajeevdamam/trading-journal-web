import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import TradeCard from '../components/TradeCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { pnl, fmtMoney, dayLabel, monthKey, monthLabel, netsByCurrency } from '../lib/utils.js'
import emptyJournalImg from '../assets/empty-states/empty-journal.png'
import emptySearchImg from '../assets/empty-states/empty-search.png'

function NetLine({ trades }) {
  const nets = netsByCurrency(trades)
  if (!nets.length) return <span className="pos">{fmtMoney(0)} Net</span>
  return (
    <>
      {nets.map(([c, net], i) => (
        <span key={c}>
          {i > 0 && <span className="muted"> · </span>}
          <span className={net >= 0 ? 'pos' : 'neg'}>{fmtMoney(net, c)}</span>
        </span>
      ))}
      <span className="muted"> Net</span>
    </>
  )
}

const FILTER_LABELS = { all: 'All', win: 'Wins', loss: 'Losses' }

export default function Journal({ trades, search, onNewEntry, onEdit, onDelete, onEmotionChange }) {
  const [filter, setFilter] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const filtered = useMemo(
    () =>
      trades
        .filter((t) => filter === 'all' || (filter === 'win' ? pnl(t) >= 0 : pnl(t) < 0))
        .filter((t) => !search || t.symbol.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.ts - a.ts),
    [trades, filter, search]
  )

  // group by month, then by day within each month
  const groups = useMemo(() => {
    const byMonth = []
    let currentMonth = null
    for (const t of filtered) {
      const mk = monthKey(t.ts)
      if (!currentMonth || currentMonth.key !== mk) {
        currentMonth = { key: mk, label: monthLabel(t.ts), trades: [] }
        byMonth.push(currentMonth)
      }
      currentMonth.trades.push(t)
    }
    return byMonth.map((m) => {
      const days = []
      let currentDay = null
      for (const t of m.trades) {
        const dl = dayLabel(t.ts)
        if (!currentDay || currentDay.label !== dl) {
          currentDay = { label: dl, trades: [] }
          days.push(currentDay)
        }
        currentDay.trades.push(t)
      }
      return { ...m, days }
    })
  }, [filtered])

  return (
    <section className="page">
      <div className="journal-head">
        <div>
          <h2 className="journal-title">All Trades</h2>
          <p className="journal-summary">
            {filtered.length} Trade{filtered.length === 1 ? '' : 's'} • <NetLine trades={filtered} />
          </p>
        </div>
        <div className="journal-actions">
          <div className="filter-wrap" ref={menuRef}>
            <button
              className="pill-btn ghost"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <Icon name="filter_list" size={16} /> {FILTER_LABELS[filter]}
            </button>
            {menuOpen && (
              <div className="filter-menu">
                {[['all', 'All trades'], ['win', 'Wins only'], ['loss', 'Losses only']].map(([id, label]) => (
                  <button key={id} onClick={() => { setFilter(id); setMenuOpen(false) }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="pill-btn primary" onClick={onNewEntry}>
            <Icon name="add" size={16} /> New Entry
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        trades.length === 0 ? (
          <EmptyState
            illustration={emptyJournalImg}
            title="No trades yet"
            text="Every entry builds the record you'll learn from. Log your first trade — it takes seconds."
            actionLabel="New Entry"
            onAction={onNewEntry}
          />
        ) : (
          <EmptyState
            illustration={emptySearchImg}
            title="Nothing matches"
            text="No trades match the current filter or search. Clear them to see your full journal."
          />
        )
      ) : (
        <div className="timeline">
          {groups.map((month) => (
            <div key={month.key}>
              <div className="month-header">
                <span className="month-title">{month.label}</span>
                <span className="month-net num">
                  <NetLine trades={month.trades} />
                </span>
              </div>
              {month.days.map((day) => (
                <div key={day.label}>
                  <div className="day-header"><span>{day.label}</span></div>
                  {day.trades.map((t) => (
                    <TradeCard key={t.id} trade={t} onEdit={onEdit} onDelete={onDelete} onEmotionChange={onEmotionChange} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
