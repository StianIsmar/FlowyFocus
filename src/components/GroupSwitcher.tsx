import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import type { Group } from '../types'

interface Props {
  groups: Group[]
  loading: boolean
  onCreate: (name: string) => Promise<Group | null>
  onUpdate: (id: string, patch: Partial<Pick<Group, 'name' | 'color'>>) => void
  onDelete: (id: string) => void
}

export default function GroupSwitcher({ groups, loading, onCreate }: Props) {
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onCreate(trimmed)
    setName('')
    setAdding(false)
  }

  return (
    <aside className={`switcher ${collapsed ? 'is-collapsed' : ''}`}>
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

      <nav className="switcher-list">
        {loading && groups.length === 0 && <div className="muted small">Loading…</div>}
        {groups.map((g) => (
          <NavLink
            key={g.id}
            to={`/g/${g.id}`}
            className={({ isActive }) => `group-pill ${isActive ? 'active' : ''}`}
            title={g.name}
          >
            <span className="group-dot" style={{ background: g.color }} />
            {!collapsed && <span className="group-name">{g.name}</span>}
          </NavLink>
        ))}

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
            <span className="group-dot ghost">+</span>
            {!collapsed && <span className="group-name">New group</span>}
          </button>
        )}
      </nav>

      <div className="switcher-foot">
        {user?.user_metadata?.avatar_url ? (
          <img className="avatar" src={user.user_metadata.avatar_url as string} alt="" />
        ) : (
          <span className="avatar avatar-fallback">
            {(user?.email ?? '?').charAt(0).toUpperCase()}
          </span>
        )}
        {!collapsed && (
          <div className="user-meta">
            <span className="user-name">{user?.user_metadata?.full_name ?? user?.email}</span>
            <button className="link-btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
