import { Link } from 'react-router-dom'
import type { Group } from '../types'
import StatusBar from './StatusBar'

interface Props {
  groups: Group[]
  stats: Record<string, number[]>
  loading: boolean
}

const EMPTY = [0, 0, 0, 0, 0, 0]

export default function Dashboard({ groups, stats, loading }: Props) {
  return (
    <div className="dashboard">
      <header className="dash-head">
        <h1 className="hello">Dashboard</h1>
        <p className="muted">A snapshot of every group by task status and priority.</p>
      </header>

      {loading && groups.length === 0 ? (
        <div className="center-screen">
          <div className="spinner" aria-label="Loading groups" />
        </div>
      ) : groups.length === 0 ? (
        <p className="muted pad">No groups yet. Create one from the sidebar.</p>
      ) : (
        <div className="dash-grid">
          {groups.map((g) => {
            const values = stats[g.id] ?? EMPTY
            const total = values[0] + values[1] + values[2]
            return (
              <Link key={g.id} to={`/g/${g.id}`} className="dash-card">
                <StatusBar values={values} />
                <div className="dash-card-foot">
                  <span className="group-dot" style={{ background: g.color, color: g.color }} />
                  <span className="dash-name">{g.name}</span>
                  <span className="dash-total">
                    {total} {total === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
