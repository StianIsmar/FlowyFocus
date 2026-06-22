import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthProvider'
import { useGroups } from './hooks/useGroups'
import { useTaskStats } from './hooks/useTaskStats'
import Login from './components/Login'
import GroupSwitcher from './components/GroupSwitcher'
import GroupFocus from './components/GroupFocus'
import Dashboard from './components/Dashboard'
import EmptyState from './components/EmptyState'

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

  return <Shell />
}

function Shell() {
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useGroups()
  const { stats, reload: reloadStats } = useTaskStats()
  const location = useLocation()

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
        onUpdate={updateGroup}
        onDelete={deleteGroup}
      />
      <main className="focus-area">
        <Routes>
          <Route
            path="/"
            element={
              loading ? (
                <div className="center-screen">
                  <div className="spinner" aria-label="Loading groups" />
                </div>
              ) : groups.length > 0 ? (
                <Navigate to={`/g/${groups[0].id}`} replace />
              ) : (
                <EmptyState onCreate={createGroup} loading={loading} />
              )
            }
          />
          <Route path="/dashboard" element={<Dashboard groups={groups} stats={stats} loading={loading} />} />
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
