import { pnl } from './utils.js'

// The psychology vocabulary of the journal. Order here is display order.
export const EMOTIONS = {
  disciplined: { label: 'Disciplined', icon: 'verified', color: '#44edb7' },
  confident: { label: 'Confident', icon: 'thumb_up', color: '#6fd3f2' },
  neutral: { label: 'Neutral', icon: 'sentiment_neutral', color: '#a9b4c6' },
  fomo: { label: 'FOMO', icon: 'local_fire_department', color: '#ffb46b' },
  revenge: { label: 'Revenge', icon: 'bolt', color: '#ff8a80' },
  overconfident: { label: 'Overconfident', icon: 'rocket_launch', color: '#c9a7ff' },
  anxious: { label: 'Anxious', icon: 'sentiment_dissatisfied', color: '#ffd166' },
}

export const EMOTION_IDS = Object.keys(EMOTIONS)
export const NEGATIVE_EMOTIONS = ['fomo', 'revenge', 'overconfident', 'anxious']

// Infer the likely emotional state behind a trade from behavioral signals:
// timing vs the previous trade, win/loss streaks, position size vs the
// trader's median for that instrument, and journaling effort. The user can
// always override the result — this is a starting point, not a verdict.
export function inferEmotion({ ts, size, symbol, notes }, priorTrades) {
  const sorted = [...priorTrades].filter((t) => t.ts < ts).sort((a, b) => a.ts - b.ts)
  const prev = sorted[sorted.length - 1]
  const gapMin = prev ? (ts - prev.ts) / 60000 : Infinity

  let winStreak = 0
  let lossStreak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (pnl(sorted[i]) >= 0) {
      if (lossStreak) break
      winStreak++
    } else {
      if (winStreak) break
      lossStreak++
    }
  }

  const sameSizes = sorted.filter((t) => t.symbol === symbol).map((t) => t.size).sort((a, b) => a - b)
  const median = sameSizes.length >= 3 ? sameSizes[Math.floor(sameSizes.length / 2)] : null
  const oversized = median != null && size >= median * 2
  const journaled = (notes || '').trim().length >= 30

  if (prev && pnl(prev) < 0 && gapMin < 30) return 'revenge'
  if (prev && pnl(prev) >= 0 && gapMin < 10) return 'fomo'
  if (winStreak >= 3 && oversized) return 'overconfident'
  if (lossStreak >= 2) return 'anxious'
  if (oversized) return 'fomo'
  if (journaled) return 'disciplined'
  if (winStreak >= 2) return 'confident'
  return 'neutral'
}

// Short human explanation of why the inference fired — shown as a hint.
export function emotionReason(id) {
  return {
    revenge: 'Re-entered within 30 min of a loss',
    fomo: 'Quick re-entry or oversized position',
    overconfident: 'Win streak + larger size than usual',
    anxious: 'Two or more losses in a row',
    disciplined: 'Thesis journaled before saving',
    confident: 'Riding a win streak at normal size',
    neutral: 'No stress signals detected',
  }[id]
}
