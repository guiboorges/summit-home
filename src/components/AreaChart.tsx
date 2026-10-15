import { useId } from 'react'

export interface Series {
  name: string
  tone: 'orange' | 'teal'
  xs: number[]
  ys: number[]
  dot?: boolean
}

const W = 1000

// Catmull-Rom to cubic Bézier, the same smoothing used for the charts in Figma.
function smooth(pts: [number, number][]): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`
  }
  return d
}

/**
 * Line + gradient area chart. The SVG stretches to its container (preserveAspectRatio="none")
 * with non-scaling strokes; the "now" dot is HTML so it stays round.
 */
export function AreaChart({ series, height, xMax, yMin = 0, yMax, grid, label, axis }: {
  series: Series[]
  height: number
  xMax: number
  yMin?: number
  yMax: number
  grid?: boolean
  label: string
  axis?: string[]
}) {
  const uid = useId().replace(/:/g, '')
  const x = (v: number) => (v / xMax) * W
  const y = (v: number) => height - ((v - yMin) / (yMax - yMin)) * height
  return (
    <figure className="chart" aria-label={label} role="img">
      <div className="chart-plot" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
          <defs>
            {series.map(s => (
              <linearGradient key={s.name} id={`${uid}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className={`stop-${s.tone}`} stopOpacity="0.28" />
                <stop offset="1" className={`stop-${s.tone}`} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {grid && [0, 1, 2, 3].map(g => <line key={g} x1="0" x2={W} y1={(g * height) / 3} y2={(g * height) / 3} className="chart-grid" vectorEffect="non-scaling-stroke" />)}
          {series.map(s => {
            const pts = s.xs.map((v, i) => [x(v), y(s.ys[i])] as [number, number])
            const d = smooth(pts)
            const last = pts[pts.length - 1]
            return (
              <g key={s.name}>
                <path d={`${d} L ${last[0]} ${height} L 0 ${height} Z`} fill={`url(#${uid}-${s.name})`} />
                <path d={d} className="chart-line" data-tone={s.tone} vectorEffect="non-scaling-stroke" />
              </g>
            )
          })}
        </svg>
        {series.filter(s => s.dot).map(s => {
          const i = s.xs.length - 1
          return <span key={s.name} className="chart-dot" data-tone={s.tone} style={{ left: `${(x(s.xs[i]) / W) * 100}%`, top: y(s.ys[i]) }} />
        })}
      </div>
      {axis && (
        <div className="chart-axis t-caption" aria-hidden="true">
          {axis.map(a => <span key={a}>{a}</span>)}
        </div>
      )}
    </figure>
  )
}
