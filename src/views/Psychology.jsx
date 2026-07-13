import Icon from '../components/Icon.jsx'
import Donut from '../components/Donut.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { computeStats } from '../lib/utils.js'
import { EMOTIONS, NEGATIVE_EMOTIONS } from '../lib/emotions.js'
import emptyPsychologyImg from '../assets/empty-states/empty-psychology.png'

function psychologyScore(trades) {
  if (!trades.length) return { score: 50, label: 'NEUTRAL' }
  const stats = computeStats(trades)
  const recent = [...trades].sort((a, b) => b.ts - a.ts).slice(0, 20)
  const notesRate = trades.filter((t) => t.notes && t.notes.length > 10).length / trades.length
  const negFrac = recent.filter((t) => NEGATIVE_EMOTIONS.includes(t.emotion)).length / recent.length
  const score = Math.round(Math.min(95, Math.max(15, 25 + stats.winRate * 0.35 + notesRate * 20 + (1 - negFrac) * 20)))
  const label = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'POOR'
  return { score, label }
}

// last-10 emotion distribution, most frequent first
function emotionMix(trades) {
  const recent = [...trades].sort((a, b) => b.ts - a.ts).slice(0, 10)
  const counts = {}
  for (const t of recent) {
    const e = EMOTIONS[t.emotion] ? t.emotion : 'neutral'
    counts[e] = (counts[e] || 0) + 1
  }
  return { total: recent.length, mix: Object.entries(counts).sort((a, b) => b[1] - a[1]) }
}

function dynamicInsights(trades) {
  const recent = [...trades].sort((a, b) => b.ts - a.ts).slice(0, 20)
  const count = (id) => recent.filter((t) => t.emotion === id).length
  const insights = []
  if (count('revenge') >= 2) {
    insights.push({
      icon: 'bolt', color: EMOTIONS.revenge.color, title: 'Revenge pattern detected',
      text: `${count('revenge')} of your recent trades came within 30 minutes of a loss. Step away after a red trade — the market will still be there.`,
    })
  }
  if (count('fomo') >= 2) {
    insights.push({
      icon: 'local_fire_department', color: EMOTIONS.fomo.color, title: 'Chasing entries',
      text: 'Several rapid re-entries or oversized positions recently. Wait for the setup to come to you.',
    })
  }
  if (count('overconfident') >= 1) {
    insights.push({
      icon: 'rocket_launch', color: EMOTIONS.overconfident.color, title: 'Watch the win-streak sizing',
      text: 'Position size crept up after a hot streak. Keep risk fixed regardless of recent results.',
    })
  }
  const journaled = recent.filter((t) => t.notes && t.notes.length >= 30).length
  if (recent.length >= 3 && journaled / recent.length >= 0.6) {
    insights.push({
      icon: 'verified', color: EMOTIONS.disciplined.color, title: 'Strong journaling habit',
      text: 'Most of your trades carry a written thesis — that discipline compounds faster than any single win.',
    })
  }
  if (!insights.length) {
    insights.push(
      {
        icon: 'check_circle', color: EMOTIONS.disciplined.color, title: 'Patience is key',
        text: 'Wait for A+ setups — most avoidable losses come from forcing trades in choppy markets.',
      },
      {
        icon: 'warning', color: EMOTIONS.anxious.color, title: 'Overtrading risk',
        text: 'Consider stepping away after two consecutive losses — a short break resets judgment.',
      }
    )
  }
  return insights.slice(0, 3)
}

export default function Psychology({ trades, onReview }) {
  if (!trades.length) {
    return (
      <section className="page">
        <div>
          <h2 className="page-title">Discipline &amp; Mindset</h2>
          <p className="page-subtitle">Your psychological edge in the market.</p>
        </div>
        <EmptyState
          illustration={emptyPsychologyImg}
          title="No psychology data yet"
          text="Once you log trades, each one gets an auto-detected emotional state — revenge, FOMO, discipline — and your score and insights appear here."
        />
      </section>
    )
  }
  const { score, label } = psychologyScore(trades)
  const { total, mix } = emotionMix(trades)
  const insights = dynamicInsights(trades)
  const dominant = mix[0] ? EMOTIONS[mix[0][0]] : null

  return (
    <section className="page">
      <div>
        <h2 className="page-title">Discipline &amp; Mindset</h2>
        <p className="page-subtitle">Your psychological edge in the market.</p>
      </div>

      <div className="card score-card">
        <h3 className="section-title">Psychology Score</h3>
        <Donut
          segments={[{ deg: (score / 100) * 360, color: '#44edb7' }]}
          size={140}
          thickness={16}
          centerTop={score}
          centerBottom={label}
        />
        <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>
          {score >= 60
            ? "You're maintaining discipline. Keep focusing on process over outcome, not just the P&L."
            : 'Discipline is slipping — slow down, review your rules, and journal every trade.'}
        </p>
      </div>

      <div>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Discipline Insights</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {insights.map((ins) => (
            <div key={ins.title} className="card insight">
              <Icon name={ins.icon} style={{ color: ins.color }} />
              <div>
                <p className="insight-title">{ins.title}</p>
                <p className="insight-text">{ins.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title" style={{ marginBottom: 4 }}>Emotional State</h3>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          Last {total || 0} trades — auto-detected, editable on each trade card
        </p>
        {total ? (
          <>
            <div className="emotion-dist">
              {mix.map(([id, count]) => (
                <div
                  key={id}
                  className="emotion-dist-seg"
                  style={{ flex: count, background: EMOTIONS[id].color }}
                  title={`${EMOTIONS[id].label}: ${count}`}
                />
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 14 }}>
              {mix.map(([id, count]) => {
                const m = EMOTIONS[id]
                return (
                  <span key={id} className="chip emotion on" style={{ borderColor: m.color, color: m.color, background: m.color + '1f' }}>
                    <Icon name={m.icon} size={15} /> {m.label} × {count}
                  </span>
                )
              })}
            </div>
            {dominant && (
              <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
                Dominant state: <strong style={{ color: dominant.color }}>{dominant.label}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>Log a few trades to see your emotional profile.</p>
        )}
      </div>

      <div>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Rules of the Game</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['Protect capital above all else.', 'Plan the trade, trade the plan.', 'Never average down a loser.'].map(
            (rule, i) => (
              <div key={rule} className={`rule-row ${i === 0 ? 'first' : ''}`}>
                <span className="rule-num">{i + 1}</span>
                <p>{rule}</p>
              </div>
            )
          )}
        </div>
      </div>

      <button className="cta-btn" onClick={onReview}>Review Yesterday's Mistakes</button>
    </section>
  )
}
