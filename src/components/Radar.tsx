'use client'
// Grafico de telarana (radar) en SVG puro. Admite varias series superpuestas.
export type RadarSerie = { nombre: string; valores: number[]; color: string }
export default function Radar({ ejes, series, size = 340 }: { ejes: string[]; series: RadarSerie[]; size?: number }) {
  const c = size / 2, R = size / 2 - 58, n = ejes.length
  const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n
  const pt = (i: number, v: number) => [c + R * (Math.max(0, Math.min(100, v)) / 100) * Math.cos(ang(i)), c + R * (Math.max(0, Math.min(100, v)) / 100) * Math.sin(ang(i))]
  const ring = (f: number) => ejes.map((_, i) => pt(i, f * 100).join(',')).join(' ')
  return (
    <svg viewBox={'0 0 ' + size + ' ' + size} style={{ width: '100%', maxWidth: size, display: 'block', margin: '0 auto' }}>
      {[0.25, 0.5, 0.75, 1].map(f => <polygon key={f} points={ring(f)} fill="none" stroke="var(--border-hi)" strokeWidth="1" />)}
      {ejes.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--border-hi)" strokeWidth="1" /> })}
      {series.map(s => (
        <g key={s.nombre}>
          <polygon points={s.valores.map((v, i) => pt(i, v).join(',')).join(' ')} fill={s.color} fillOpacity="0.18" stroke={s.color} strokeWidth="2" />
          {s.valores.map((v, i) => { const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r="3" fill={s.color} /> })}
        </g>
      ))}
      {ejes.map((e, i) => {
        const [x, y] = pt(i, 118); const a = Math.cos(ang(i))
        return <text key={e} x={x} y={y} fontSize="11" fill="var(--text-2)" textAnchor={Math.abs(a) < 0.2 ? 'middle' : a > 0 ? 'start' : 'end'} dominantBaseline="middle">{e}</text>
      })}
    </svg>
  )
}
