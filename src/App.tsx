import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthProvider'
import { useGroups } from './hooks/useGroups'
import Login from './components/Login'
import GroupSwitcher from './components/GroupSwitcher'
import GroupFocus from './components/GroupFocus'
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

  return (
    <div className="app">
      <GroupSwitcher
        groups={groups}
        loading={loading}
        onCreate={createGroup}
        onUpdate={updateGroup}
        onDelete={deleteGroup}
      />
      <main className="focus-area">
        <Routes>
          <Route
            path="/"
            element={
              groups.length > 0 ? (
                <Navigate to={`/g/${groups[0].id}`} replace />
              ) : (
                <EmptyState onCreate={createGroup} loading={loading} />
              )
            }
          />
          <Route
            path="/g/:groupId"
            element={
              <GroupFocus
                groups={groups}
                onUpdateGroup={updateGroup}
                onDeleteGroup={deleteGroup}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
