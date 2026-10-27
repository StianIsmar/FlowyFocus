import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowLeftToLine, ArrowRightFromLine, LayoutDashboard, LogOut, Plus, Star } from 'lucide-react'
import { useAuth } from '../context/AuthProvider'
import type { Group } from '../types'
import ThemeToggle from './ThemeToggle'
import Pomodoro from './Pomodoro'

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onCreate(trimmed)
    setName('')
    setAdding(false)
  }

  return (
    <aside className={`switcher ${collapsed ? 'is-collapsed' : ''} ${focusActive ? 'focus-active' : ''}`} aria-label="Workspace navigation">
      <div className="switcher-head">
        <button
          className="icon-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand groups' : 'Collapse groups'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ArrowRightFromLine size={17} /> : <ArrowLeftToLine size={17} />}
        </button>
        {!collapsed && <span className="switcher-title">flowyfocus<span className="brand-period">.</span></span>}
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
          title="Today"
        >
          <LayoutDashboard size={17} />
          {!collapsed && <span className="group-name">Today</span>}
        </NavLink>
        <NavLink to="/important" className={({ isActive }) => `group-pill ${isActive ? 'active' : ''}`} title="Important"><Star size={17} />{!collapsed && <span className="group-name">Important</span>}</NavLink>
        {!collapsed && <span className="nav-section-label">Groups</span>}

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
              aria-label="New group name"
              onBlur={() => !name && setAdding(false)}
              maxLength={80}
            />
          </form>
        ) : (
          <button className="group-add" onClick={() => { setCollapsed(false); setAdding(true) }} title="New group">
            <span className="group-add-icon" aria-hidden>
              <Plus size={16} />
            </span>
            {!collapsed && <span className="group-name">New group</span>}
          </button>
        )}
      </nav>

      <div className="switcher-foot">
        <Pomodoro collapsed={collapsed} onRunningChange={setFocusActive} />
        <ThemeToggle collapsed={collapsed} />
        <button className="sidebar-signout" onClick={signOut} title="Sign out" aria-label="Sign out">
          <LogOut size={16} />{!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
