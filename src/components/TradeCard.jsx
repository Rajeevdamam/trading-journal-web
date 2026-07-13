import { useState } from 'react'
import Icon from './Icon.jsx'
import { pnl, fmtMoney, fmtPrice, fmtTime, dayLabel } from '../lib/utils.js'
import { instrumentFor } from '../lib/instruments.js'
import { EMOTIONS, EMOTION_IDS } from '../lib/emotions.js'

function EmotionTag({ trade, onChange }) {
  const [picking, setPicking] = useState(false)
  const meta = EMOTIONS[trade.emotion] ?? EMOTIONS.neutral

  if (!picking) {
    return (
      <button
        type="button"
        className="chip emotion on"
        style={{ borderColor: meta.color, color: meta.color, background: meta.color + '1f' }}
        title={onChange ? 'Tap to change psychology' : undefined}
        onClick={onChange ? () => setPicking(true) : undefined}
      >
        <Icon name={meta.icon} size={15} /> {meta.label}{trade.emotionAuto ? ' · auto' : ''}
      </button>
    )
  }
  return (
    <div className="chip-row">
      {EMOTION_IDS.map((id) => {
        const m = EMOTIONS[id]
        const on = trade.emotion === id
        return (
          <button
            key={id}
            type="button"
            className={`chip emotion ${on ? 'on' : ''}`}
            style={on ? { borderColor: m.color, color: m.color, background: m.color + '1f' } : undefined}
            onClick={() => {
              onChange(trade.id, id)
              setPicking(false)
            }}
          >
            <Icon name={m.icon} size={15} /> {m.label}
          </button>
        )
      })}
    </div>
  )
}

export default function TradeCard({ trade, expandable = true, showDay = false, onEdit, onDelete, onEmotionChange }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const value = pnl(trade)
  const win = value >= 0
  const currency = trade.currency ?? 'USD'
  const decimals = instrumentFor(trade.symbol).priceDecimals

  const summary = (
    <div className="trade-top">
      <div className="trade-sym">
        <span className="sym">{trade.symbol}</span>
        <span className={`side-tag ${trade.side === 'LONG' ? 'long' : 'short'}`}>{trade.side}</span>
      </div>
      <div className="trade-right">
        <div>
          <span className={`trade-pnl num ${win ? 'pos' : 'neg'}`}>{fmtMoney(value, currency)}</span>
          <span className="trade-time">
            {showDay ? `${dayLabel(trade.ts)}, ` : ''}{fmtTime(trade.ts)}
          </span>
        </div>
        {expandable && <Icon name="expand_more" size={20} className={`chevron ${open ? 'open' : ''}`} />}
      </div>
    </div>
  )

  const routeLine = (
    <span className="trade-route num">
      {fmtPrice(trade.entry, decimals)} → {fmtPrice(trade.exit, decimals)} · {trade.size} {instrumentFor(trade.symbol).sizeLabel === 'Lots' ? 'lot' + (trade.size === 1 ? '' : 's') : 'qty'}
    </span>
  )

  return (
    <div className="trade-card">
      <div className={`accent ${win ? 'pos' : 'neg'}`} />
      {expandable ? (
        <button
          type="button"
          className="trade-row-btn"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {summary}
          {routeLine}
        </button>
      ) : (
        <div className="trade-row-btn">{summary}</div>
      )}
      {expandable && (
        <div className={`details-panel ${open ? 'open' : ''}`}>
          <div className="details-inner">
            <div className="details-body">
              <div className="detail-grid">
                <div><span className="label">Entry price</span><span className="num">{fmtPrice(trade.entry, decimals)}</span></div>
                <div><span className="label">Exit price</span><span className="num">{fmtPrice(trade.exit, decimals)}</span></div>
                <div><span className="label">Size</span><span className="num">{trade.size}</span></div>
                <div><span className="label">Asset</span><span>{trade.asset || 'OTHER'}</span></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span className="label" style={{ display: 'block', marginBottom: 6 }}>Psychology</span>
                <EmotionTag trade={trade} onChange={onEmotionChange} />
              </div>
              {trade.notes && <div className="notes-box">{trade.notes}</div>}
              {(onEdit || onDelete) && (
                <div className="trade-actions">
                  {onEdit && (
                    <button className="small-btn" onClick={() => onEdit(trade)}>
                      <Icon name="edit" size={16} /> EDIT
                    </button>
                  )}
                  {onDelete && !confirming && (
                    <button className="small-btn danger" onClick={() => setConfirming(true)}>
                      <Icon name="delete" size={16} /> DELETE
                    </button>
                  )}
                  {onDelete && confirming && (
                    <span className="confirm-inline">
                      Delete this trade?
                      <button className="small-btn danger" onClick={() => onDelete(trade.id)}>YES</button>
                      <button className="small-btn" onClick={() => setConfirming(false)}>NO</button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
