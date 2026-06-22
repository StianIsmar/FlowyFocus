import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Group } from '../types'
import { GROUP_COLORS } from '../types'
import { useAuth } from '../context/AuthProvider'
import { useTasks } from '../hooks/useTasks'
import TasksView from './TasksView'
import NotesPanel from './NotesPanel'

interface Props {
  groups: Group[]
  onUpdateGroup: (id: string, patch: Partial<Pick<Group, 'name' | 'color'>>) => void
  onDeleteGroup: (id: string) => void
  onTasksChanged?: () => void
}

type Tab = 'tasks' | 'notes'

export default function GroupFocus({ groups, onUpdateGroup, onDeleteGroup, onTasksChanged }: Props) {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const group = groups.find((g) => g.id === groupId)
  const [tab, setTab] = useState<Tab>('tasks')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const firstName =
    ((user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]) ??
    user?.email?.split('@')[0] ??
    'there'

  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    setStatus,
    setSubtasks,
    deleteTask,
  } = useTasks(groupId)

  const bump = onTasksChanged ?? (() => {})
  const createTaskAndSync: typeof createTask = async (input) => {
    await createTask(input)
    bump()
  }
  const updateTaskAndSync: typeof updateTask = async (id, patch) => {
    await updateTask(id, patch)
    bump()
  }
  const setStatusAndSync: typeof setStatus = async (task, status) => {
    await setStatus(task, status)
    bump()
  }
  const deleteTaskAndSync: typeof deleteTask = async (id) => {
    await deleteTask(id)
    bump()
  }

  if (!group) {
    return (
      <div className="empty-state">
        <p className="muted">Group not found.</p>
      </div>
    )
  }

  const accent = group.color

  return (
    <div className="focus" style={{ ['--accent' as string]: accent }}>
      <header className="focus-header">
        <div className="greeting">
          <h1 className="hello">
            Welcome back, <span className="grad">{firstName}</span> 
          </h1>
        </div>
        <div className="focus-tabs">
          <span className="topbar-date">
            {new Date().toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <button
            className={tab === 'tasks' ? 'tab active' : 'tab'}
            onClick={() => setTab('tasks')}
          >
            Board
          </button>
          <button
            className={tab === 'notes' ? 'tab active' : 'tab'}
            onClick={() => setTab('notes')}
          >
            Notes
          </button>
          <button
            className="icon-btn"
            title="Group settings"
            onClick={() => setSettingsOpen((s) => !s)}
          >
            ⚙
          </button>
        </div>
      </header>

      {settingsOpen && (
        <GroupSettings
          group={group}
          onUpdate={onUpdateGroup}
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => {
            onDeleteGroup(group.id)
            navigate('/', { replace: true })
          }}
        />
      )}

      {tab === 'tasks' ? (
        <TasksView
          tasks={tasks}
          loading={loading}
          error={error}
          onCreate={createTaskAndSync}
          onUpdate={updateTaskAndSync}
          onSetStatus={setStatusAndSync}
          onSetSubtasks={setSubtasks}
          onDelete={deleteTaskAndSync}
        />
      ) : (
        <NotesPanel groupId={group.id} accent={accent} />
      )}
    </div>
  )
}

function GroupSettings({
  group,
  onUpdate,
  onClose,
  onDeleted,
}: {
  group: Group
  onUpdate: Props['onUpdateGroup']
  onClose: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(group.name)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="group-settings">
      <input
        className="settings-name"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (name.trim() && name !== group.name) onUpdate(group.id, { name: name.trim() })
            onClose()
          }
        }}
        onBlur={() => name.trim() && name !== group.name && onUpdate(group.id, { name: name.trim() })}
      />
      <div className="swatches">
        {GROUP_COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${c === group.color ? 'sel' : ''}`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            onClick={() => onUpdate(group.id, { color: c })}
          />
        ))}
      </div>
      <div className="settings-actions">
        <button
          className="link-btn danger"
          onClick={() => {
            if (confirm(`Delete "${group.name}" and all its tasks and notes?`)) {
              onDeleted()
            }
          }}
        >
          Delete group
        </button>
        <button className="link-btn" onClick={onClose}>
          Done
          <span className="enter-hint" aria-hidden>↵</span>
        </button>
      </div>
    </div>
  )
}
