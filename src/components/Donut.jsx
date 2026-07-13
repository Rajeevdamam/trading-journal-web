export default function Donut({ segments, size = 160, thickness = 24, centerTop, centerBottom }) {
  // segments: [{ deg, color }] — falls back to a flat ring when empty
  const stops = []
  let acc = 0
  for (const seg of segments) {
    stops.push(`${seg.color} ${acc}deg ${acc + seg.deg}deg`)
    acc += seg.deg
  }
  if (acc < 360) stops.push(`#262a35 ${acc}deg 360deg`)
  const background = `conic-gradient(${stops.join(', ')})`
  const hole = size - thickness * 2

  return (
    <div className="donut" style={{ width: size, height: size, background }}>
      <div className="donut-hole" style={{ width: hole, height: hole }}>
        <span className="num" style={{ fontSize: 24, fontWeight: 700 }}>{centerTop}</span>
        <span className="label">{centerBottom}</span>
      </div>
    </div>
  )
}
