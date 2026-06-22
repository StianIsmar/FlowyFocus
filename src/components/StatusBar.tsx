import { STATUS_COLUMNS, PRIORITY_META } from '../types'

interface Props {
  /** Raw counts in STAT_AXES order: [todo, in_progress, done, high, medium, low]. */
  values: number[]
}

const STATUS_SEGMENTS = [
  { key: 'todo', index: 0, color: STATUS_COLUMNS[0].color, label: STATUS_COLUMNS[0].label },
  { key: 'in_progress', index: 1, color: STATUS_COLUMNS[1].color, label: STATUS_COLUMNS[1].label },
  { key: 'done', index: 2, color: STATUS_COLUMNS[2].color, label: STATUS_COLUMNS[2].label },
]

const PRIORITY_SEGMENTS = [
  { key: 'high', index: 3, color: PRIORITY_META.high.color, label: PRIORITY_META.high.label },
  { key: 'medium', index: 4, color: PRIORITY_META.medium.color, label: PRIORITY_META.medium.label },
  { key: 'low', index: 5, color: PRIORITY_META.low.color, label: PRIORITY_META.low.label },
]

function Bar({
  segments,
  values,
}: {
  segments: { key: string; index: number; color: string; label: string }[]
  values: number[]
}) {
  const total = segments.reduce((sum, s) => sum + values[s.index], 0)
  return (
    <div className="statusbar-track" role="img">
      {total === 0 ? (
        <div className="statusbar-empty" />
      ) : (
        segments.map((s) => {
          const count = values[s.index]
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={s.key}
              className="statusbar-seg"
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${count}`}
            />
          )
        })
      )}
    </div>
  )
}

export default function StatusBar({ values }: Props) {
  const doneCount = values[2]
  const statusTotal = values[0] + values[1] + values[2]
  const pctDone = statusTotal > 0 ? Math.round((doneCount / statusTotal) * 100) : 0

  return (
    <div className="statusbar">
      <div className="statusbar-row">
        <span className="statusbar-caption">Status</span>
        <span className="statusbar-pct">{pctDone}% done</span>
      </div>
      <Bar segments={STATUS_SEGMENTS} values={values} />
      <div className="statusbar-legend">
        {STATUS_SEGMENTS.map((s) => (
          <span key={s.key} className="statusbar-legend-item">
            <span className="statusbar-dot" style={{ background: s.color }} />
            {s.label} {values[s.index]}
          </span>
        ))}
      </div>

      <div className="statusbar-row statusbar-row-priority">
        <span className="statusbar-caption">Priority</span>
      </div>
      <Bar segments={PRIORITY_SEGMENTS} values={values} />
      <div className="statusbar-legend">
        {PRIORITY_SEGMENTS.map((s) => (
          <span key={s.key} className="statusbar-legend-item">
            <span className="statusbar-dot" style={{ background: s.color }} />
            {s.label} {values[s.index]}
          </span>
        ))}
      </div>
    </div>
  )
}
