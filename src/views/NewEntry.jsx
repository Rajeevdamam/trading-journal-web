import { useCallback, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import SlideToSave from '../components/SlideToSave.jsx'
import { SYMBOLS, instrumentFor } from '../lib/instruments.js'
import { EMOTIONS, EMOTION_IDS, inferEmotion, emotionReason } from '../lib/emotions.js'

const LAST_SIZE_KEY = 'trading-journal.lastSize'

function lastSizes() {
  try {
    return JSON.parse(localStorage.getItem(LAST_SIZE_KEY)) || {}
  } catch {
    return {}
  }
}

function rememberSize(symbol, size) {
  try {
    localStorage.setItem(LAST_SIZE_KEY, JSON.stringify({ ...lastSizes(), [symbol]: size }))
  } catch { /* storage full/blocked — non-critical */ }
}

export default function NewEntry({ trades, editingTrade, onSave, onBack }) {
  const editing = Boolean(editingTrade)
  const [symbol, setSymbol] = useState(editingTrade?.symbol ?? 'NIFTY 50')
  const inst = instrumentFor(symbol)

  const [side, setSide] = useState(editingTrade?.side ?? 'LONG')
  const [qty, setQty] = useState(editingTrade?.size ?? lastSizes()[symbol] ?? inst.defaultSize)
  const [price, setPrice] = useState(editingTrade?.entry ?? '')
  const [exit, setExit] = useState(editingTrade?.exit != null ? String(editingTrade.exit) : '')
  const [notes, setNotes] = useState(editingTrade?.notes ?? '')
  const [emotionOverride, setEmotionOverride] = useState(editingTrade?.emotion ?? null)
  const [error, setError] = useState(null)

  const pickSymbol = (s) => {
    setSymbol(s)
    const next = instrumentFor(s)
    setQty(lastSizes()[s] ?? next.defaultSize)
    setPrice('')
    setExit('')
  }

  // Live auto-detected psychology for this entry; override wins if set
  const suggested = useMemo(
    () => inferEmotion({ ts: editingTrade?.ts ?? Date.now(), size: parseFloat(qty) || 0, symbol, notes }, trades),
    [qty, symbol, notes, trades, editingTrade]
  )
  const emotion = emotionOverride ?? suggested

  const stepQty = (dir) => {
    const step = inst.lotSize
    const current = parseFloat(qty) || 0
    const next = Math.min(Math.max(current + dir * step, inst.sizeMin), inst.sizeMax)
    // avoid float drift on 0.01 steps
    setQty(Number(next.toFixed(4)))
  }

  const handleSave = useCallback(async () => {
    const entryPrice = parseFloat(price)
    if (!entryPrice || entryPrice <= 0) {
      setError('Enter the entry price.')
      return false
    }
    const size = parseFloat(qty)
    if (!size || size <= 0) {
      setError(`Enter a valid ${inst.sizeLabel.toLowerCase()}.`)
      return false
    }
    setError(null)
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
    const exitPrice = exit !== '' ? clamp(parseFloat(exit) || entryPrice, 0, 1e9) : entryPrice
    rememberSize(symbol, size)
    onSave({
      symbol,
      side,
      asset: inst.asset,
      currency: inst.currency,
      multiplier: inst.multiplier,
      entry: clamp(entryPrice, 0, 1e9),
      exit: exitPrice,
      size: clamp(size, inst.sizeMin, inst.sizeMax),
      notes: notes.trim().slice(0, 4000),
      emotion,
      emotionAuto: emotionOverride == null,
    })
    return true
  }, [symbol, side, qty, price, exit, notes, emotion, emotionOverride, inst, onSave])

  return (
    <section className="page">
      <div className="entry-head">
        <div>
          <button className="back-btn" onClick={onBack}>
            <Icon name="arrow_back" size={18} /> Back to journal
          </button>
          <h2 className="page-title">{editing ? 'Edit Entry' : 'New Entry'}</h2>
          <p className="page-subtitle">{editing ? 'Update this trade record.' : 'Two taps, two numbers, done.'}</p>
        </div>
        <span className="draft-badge">{editing ? 'EDITING' : 'DRAFT'}</span>
      </div>

      <div className="card field-card">
        <span className="label">Instrument</span>
        <div className="seg-group" role="group" aria-label="Instrument">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              className={`seg-btn ${symbol === s ? 'on' : ''}`}
              aria-pressed={symbol === s}
              onClick={() => pickSymbol(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{inst.hint}</span>
      </div>

      <div className="dir-grid" role="group" aria-label="Trade direction">
        <button
          type="button"
          className={`dir-btn ${side === 'LONG' ? 'on' : 'off'}`}
          aria-pressed={side === 'LONG'}
          onClick={() => setSide('LONG')}
        >
          <Icon name="trending_up" size={18} /> BUY / LONG
        </button>
        <button
          type="button"
          className={`dir-btn ${side === 'SHORT' ? 'on' : 'off'}`}
          aria-pressed={side === 'SHORT'}
          onClick={() => setSide('SHORT')}
        >
          <Icon name="trending_down" size={18} /> SELL / SHORT
        </button>
      </div>

      <div className="card field-card">
        <div className="stepper-head">
          <label className="label" htmlFor="f-qty">{inst.sizeLabel}</label>
          {inst.lotSize > 1 && (parseFloat(qty) || 0) > 0 && (parseFloat(qty) || 0) % inst.lotSize === 0 && (
            <span className="muted" style={{ fontSize: 12 }}>
              {(parseFloat(qty) || 0) / inst.lotSize} lot{(parseFloat(qty) || 0) > inst.lotSize ? 's' : ''}
            </span>
          )}
        </div>
        <div className="stepper">
          <button type="button" className="stepper-btn" aria-label={`Decrease ${inst.sizeLabel}`} onClick={() => stepQty(-1)}>
            <Icon name="remove" size={20} />
          </button>
          <input
            id="f-qty"
            className="stepper-value num"
            type="number"
            inputMode="decimal"
            min={inst.sizeMin}
            max={inst.sizeMax}
            step={inst.lotSize}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <button type="button" className="stepper-btn" aria-label={`Increase ${inst.sizeLabel}`} onClick={() => stepQty(1)}>
            <Icon name="add" size={20} />
          </button>
        </div>
        <div className="chip-row">
          {inst.sizeChips.map((v) => (
            <button
              key={v}
              type="button"
              className={`chip ${Number(qty) === v ? 'on' : ''}`}
              onClick={() => setQty(v)}
            >
              {inst.chipLabel(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="price-grid">
        <div className="card field-card">
          <label className="label" htmlFor="f-price">Entry price ({inst.currency === 'INR' ? '₹' : '$'})</label>
          <input
            id="f-price"
            className="text-input num"
            type="number"
            inputMode="decimal"
            step={inst.priceStep}
            min="0"
            placeholder={String(inst.defaultPrice)}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="card field-card">
          <label className="label" htmlFor="f-exit">Exit price</label>
          <input
            id="f-exit"
            className="text-input num"
            type="number"
            inputMode="decimal"
            step={inst.priceStep}
            min="0"
            placeholder="blank = open"
            value={exit}
            onChange={(e) => setExit(e.target.value)}
          />
        </div>
      </div>

      <div className="card field-card">
        <div className="stepper-head">
          <span className="label">Psychology</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {emotionOverride ? 'set by you' : `auto · ${emotionReason(suggested)}`}
          </span>
        </div>
        <div className="chip-row">
          {EMOTION_IDS.map((id) => {
            const meta = EMOTIONS[id]
            const on = emotion === id
            return (
              <button
                key={id}
                type="button"
                className={`chip emotion ${on ? 'on' : ''}`}
                style={on ? { borderColor: meta.color, color: meta.color, background: meta.color + '1f' } : undefined}
                onClick={() => setEmotionOverride(id === emotionOverride ? null : id)}
              >
                <Icon name={meta.icon} size={15} /> {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card field-card">
        <label className="label" htmlFor="f-notes">Notes &amp; thesis (optional)</label>
        <textarea
          id="f-notes"
          className="text-input"
          placeholder="Why did you take this trade?"
          rows={2}
          maxLength={4000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="entry-error">{error}</p>}

      <SlideToSave
        label={editing ? 'SLIDE TO UPDATE ENTRY' : 'SLIDE TO SAVE ENTRY'}
        onComplete={handleSave}
      />
    </section>
  )
}
