import { useState, type FormEvent } from 'react'
import { ChevronsLeft, ChevronsRight, LayoutDashboard, LogOut, Plus, Star } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import type { Group } from '../types'
import Pomodoro from './Pomodoro'
import ThemeToggle from './ThemeToggle'

interface Props {
  groups: Group[]
  loading: boolean
  stats: Record<string, number[]>
  onCreate: (name: string) => Promise<Group | null>
}

export default function GroupSwitcher({ groups, loading, onCreate }: Props) {
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [focusActive, setFocusActive] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onCreate(trimmed)
    setName('')
    setAdding(false)
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
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
        {!collapsed && <span className="switcher-title">Flowy Focus</span>}
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
          <LayoutDashboard className="nav-icon" size={16} aria-hidden />
          {!collapsed && <span className="group-name">Dashboard</span>}
        </NavLink>

        <NavLink
          to="/important"
          className={({ isActive }) => `group-pill ${isActive ? 'active' : ''}`}
          title="Most important"
        >
          <Star className="nav-icon important" size={16} aria-hidden />
          {!collapsed && <span className="group-name">Most important</span>}
        </NavLink>

        {loading && groups.length === 0 && <div className="muted small">Loading…</div>}
        {groups.map((g) => (
          <NavLink
            key={g.id}
            to={`/g/${g.id}`}
            className={({ isActive }) => `group-pill ${isActive ? 'active' : ''}`}
            title={g.name}
          >
            <span className="group-dot" style={{ background: g.color, color: g.color }} />
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
            <Plus className="group-add-icon" size={16} aria-hidden />
            {!collapsed && <span className="group-name">New group</span>}
          </button>
        )}
      </nav>

      <div className="switcher-foot">
        <Pomodoro collapsed={collapsed} onRunningChange={setFocusActive} />
        <ThemeToggle collapsed={collapsed} />
        <button className={`foot-signout ${collapsed ? 'icon-only' : ''}`} onClick={signOut} title="Sign out">
          <LogOut size={16} aria-hidden />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
