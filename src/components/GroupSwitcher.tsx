import { useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import type { Group } from '../types'
import Pomodoro from './Pomodoro'

interface Props {
  groups: Group[]
  loading: boolean
  stats: Record<string, number[]>
  onCreate: (name: string) => Promise<Group | null>
  onUpdate: (id: string, patch: Partial<Pick<Group, 'name' | 'color'>>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export default function GroupSwitcher({ groups, loading, onCreate, onUpdate, onDelete }: Props) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [focusActive, setFocusActive] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onCreate(trimmed)
    setName('')
    setAdding(false)
  }

  const beginEdit = (group: Group) => {
    setAdding(false)
    setEditingId(group.id)
    setEditingName(group.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const submitEdit = async (e: FormEvent, group: Group) => {
    e.preventDefault()
    const trimmed = editingName.trim()
    if (!trimmed) return
    if (trimmed === group.name) {
      cancelEdit()
      return
    }
    setPendingId(group.id)
    const saved = await onUpdate(group.id, { name: trimmed })
    setPendingId(null)
    if (saved) cancelEdit()
  }

  const deleteGroup = async (group: Group) => {
    if (!confirm(`Delete "${group.name}" and all its tasks and notes?`)) return
    setPendingId(group.id)
    const deleted = await onDelete(group.id)
    setPendingId(null)
    if (!deleted) return

    if (location.pathname === `/g/${group.id}`) {
      const next = groups.find((g) => g.id !== group.id)
      navigate(next ? `/g/${next.id}` : '/', { replace: true })
    }
  }

  return (
    <aside className={`switcher ${collapsed ? 'is-collapsed' : ''} ${focusActive ? 'focus-active' : ''}`}>
      <div className="switcher-head">
        <button
          className="icon-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand groups' : 'Collapse groups'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '»' : '«'}
        </button>
        {!collapsed && <span className="switcher-title">Groups</span>}
      </div>

      <div className="profile">
        <span className="avatar-ring">
          {user?.user_metadata?.avatar_url ? (
            <img className="avatar" src={user.user_metadata.avatar_url as string} alt="" />
          ) : (
            <span className="avatar avatar-fallback">
              {(user?.email ?? '?').charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        {!collapsed && (
          <div className="profile-meta">
            <span className="profile-name">
              {(user?.user_metadata?.full_name as string) ?? user?.email}
            </span>
            <span className="profile-sub">{user?.email}</span>
          </div>
        )}
      </div>

      <nav className="switcher-list">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `group-pill ${isActive ? 'active' : ''}`}
          title="Dashboard"
        >
          <span className="group-dot ghost">▦</span>
          {!collapsed && <span className="group-name">Dashboard</span>}
        </NavLink>

        {loading && groups.length === 0 && <div className="muted small">Loading…</div>}
        {groups.map((g) => {
          const isEditing = editingId === g.id && !collapsed
          const isPending = pendingId === g.id

          if (isEditing) {
            return (
              <form key={g.id} className="group-edit-form" onSubmit={(e) => submitEdit(e, g)}>
                <span className="group-dot" style={{ background: g.color, color: g.color }} />
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  disabled={isPending}
                  maxLength={80}
                />
                <button className="group-action" type="submit" disabled={isPending} title="Save group name">
                  ✓
                </button>
                <button className="group-action" type="button" onClick={cancelEdit} disabled={isPending} title="Cancel edit">
                  ×
                </button>
              </form>
            )
          }

          return (
            <div key={g.id} className="group-row">
              <NavLink
                to={`/g/${g.id}`}
                className={({ isActive }) => `group-pill ${isActive ? 'active' : ''}`}
                title={g.name}
              >
                <span className="group-dot" style={{ background: g.color, color: g.color }} />
                {!collapsed && <span className="group-name">{g.name}</span>}
              </NavLink>
              {!collapsed && (
                <span className="group-actions">
                  <button className="group-action" type="button" onClick={() => beginEdit(g)} disabled={isPending} title="Edit group name">
                    ✎
                  </button>
                  <button className="group-action danger" type="button" onClick={() => deleteGroup(g)} disabled={isPending} title="Delete group">
                    ×
                  </button>
                </span>
              )}
            </div>
          )
        })}

        {adding && !collapsed ? (
          <form className="group-add-form" onSubmit={submit}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name…"
              onBlur={() => !name && setAdding(false)}
              maxLength={80}
            />
          </form>
        ) : (
          <button className="group-add" onClick={() => setAdding(true)} title="New group">
            <span className="group-add-icon" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2.5v9M2.5 7h9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            {!collapsed && <span className="group-name">New group</span>}
          </button>
        )}
      </nav>

      <div className="switcher-foot">
        <Pomodoro collapsed={collapsed} onRunningChange={setFocusActive} />
        {!collapsed && (
          <div className="consistency">
            <Sparkline />
            <div className="consistency-label">
              <small>Good</small>
              <b>Consistency</b>
            </div>
          </div>
        )}
        <button className="link-btn foot-signout" onClick={signOut}>
          Sign out
        </button>
      </div>
    </aside>
  )
}

function Sparkline() {
  return (
    <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4f7cff" />
          <stop offset="100%" stopColor="#ff4ecd" />
        </linearGradient>
      </defs>
      <path
        d="M2 30 C 20 30, 28 12, 46 16 S 78 34, 96 24 S 132 6, 150 18 S 184 28, 198 10"
        fill="none"
        stroke="url(#spark)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
