import { STAT_AXES } from '../types'

interface Props {
  /** Raw counts in STAT_AXES order: [todo, in_progress, done, high, medium, low]. */
  values: number[]
  /** Fill/stroke color (usually the group's color). */
  color: string
  /** Full SVG size in px. */
  size?: number
  /** Show axis labels around the chart. */
  showLabels?: boolean
}

const DEG = Math.PI / 180

export default function StatHexagon({ values, color, size = 28, showLabels = false }: Props) {
  const c = size / 2
  const pad = showLabels ? size * 0.2 : size * 0.12
  const R = c - pad
  const max = Math.max(0, ...values)

  const axis = STAT_AXES.map((a, i) => {
    const ang = (-90 + i * 60) * DEG
    const cos = Math.cos(ang)
    const sin = Math.sin(ang)
    // Give every axis a small floor so a group with only one or two
    // populated axes still renders as a filled shape instead of a sliver.
    const FLOOR = 0.22
    const ratio = max > 0 ? FLOOR + (values[i] / max) * (1 - FLOOR) : 0
    return {
      label: a.label,
      cos,
      sin,
      // outer hexagon vertex
      ox: c + R * cos,
      oy: c + R * sin,
      // value vertex
      vx: c + R * ratio * cos,
      vy: c + R * ratio * sin,
    }
  })

  const outline = axis.map((p) => `${p.ox.toFixed(1)},${p.oy.toFixed(1)}`).join(' ')
  const mid = axis.map((p) => `${(c + (p.ox - c) * 0.5).toFixed(1)},${(c + (p.oy - c) * 0.5).toFixed(1)}`).join(' ')
  const valuePoly = axis.map((p) => `${p.vx.toFixed(1)},${p.vy.toFixed(1)}`).join(' ')

  return (
    <svg
      className="stat-hex"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      {/* grid */}
      <polygon points={outline} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      <polygon points={mid} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {axis.map((p, i) => (
        <line
          key={i}
          x1={c}
          y1={c}
          x2={p.ox}
          y2={p.oy}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* value shape, or a center dot when empty */}
      {max > 0 ? (
        <polygon
          points={valuePoly}
          fill={color}
          fillOpacity={0.7}
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : (
        <circle cx={c} cy={c} r={Math.max(2, size * 0.04)} fill={color} />
      )}

      {showLabels &&
        axis.map((p, i) => {
          const lx = c + (R + size * 0.11) * p.cos
          const ly = c + (R + size * 0.11) * p.sin
          const anchor = p.cos > 0.3 ? 'start' : p.cos < -0.3 ? 'end' : 'middle'
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              fontSize={size * 0.055}
              fill="rgba(255,255,255,0.6)"
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              {p.label}
            </text>
          )
        })}
    </svg>
  )
}
