import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthProvider'
import { useGroups } from './hooks/useGroups'
import { useTaskStats } from './hooks/useTaskStats'
import Login from './components/Login'
import GroupSwitcher from './components/GroupSwitcher'
import GroupFocus from './components/GroupFocus'
import ImportantFocus from './components/ImportantFocus'
import Dashboard from './components/Dashboard'
import EmptyState from './components/EmptyState'
import { WorkbenchProvider } from './context/WorkbenchProvider'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" aria-label="Loading" />
      </div>
    )
  }

  if (!user) return <Login />

  return <WorkbenchProvider><Shell /></WorkbenchProvider>
}

function Shell() {
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useGroups()
  const { stats, reload: reloadStats } = useTaskStats()
  const location = useLocation()
  const navigate = useNavigate()
  const activeWorkspace = groups.some((group) => location.pathname === `/g/${group.id}`)
    ? location.pathname
    : location.pathname === '/important' ? '/important' : '/dashboard'

  useEffect(() => {
    reloadStats()
  }, [location.pathname, reloadStats])

  return (
    <div className="app">
      <GroupSwitcher
        groups={groups}
        loading={loading}
        stats={stats}
        onCreate={createGroup}
      />
      <main className="focus-area">
        <div className="mobile-group-switcher">
          <label htmlFor="mobile-workspace">Workspace</label>
          <select
            id="mobile-workspace"
            value={activeWorkspace}
            onChange={(event) => navigate(event.target.value)}
            disabled={loading}
          >
            <option value="/dashboard">Today</option>
            <option value="/important">Important</option>
            {groups.length > 0 && (
              <optgroup label="Groups">
                {groups.map((group) => <option key={group.id} value={`/g/${group.id}`}>{group.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <Routes>
          <Route
            path="/"
            element={
              loading ? (
                <div className="center-screen">
                  <div className="spinner" aria-label="Loading groups" />
                </div>
              ) : groups.length > 0 ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <EmptyState onCreate={createGroup} loading={loading} />
              )
            }
          />
          <Route path="/dashboard" element={<Dashboard groups={groups} stats={stats} loading={loading} onTasksChanged={reloadStats} />} />
          <Route
            path="/important"
            element={<ImportantFocus groups={groups} onTasksChanged={reloadStats} />}
          />
          <Route
            path="/g/:groupId"
            element={
              <GroupFocus
                groups={groups}
                onUpdateGroup={updateGroup}
                onDeleteGroup={deleteGroup}
                onTasksChanged={reloadStats}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
