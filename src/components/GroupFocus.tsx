import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Group } from '../types'
import { useAuth } from '../context/AuthProvider'
import { useTasks } from '../hooks/useTasks'
import TasksView from './TasksView'
import NotesPanel from './NotesPanel'

interface Props {
  groups: Group[]
  onUpdateGroup: (id: string, patch: Partial<Pick<Group, 'name' | 'color'>>) => Promise<boolean>
  onDeleteGroup: (id: string) => Promise<boolean>
  onTasksChanged?: () => void
}

type Tab = 'tasks' | 'notes'

export default function GroupFocus({ groups, onUpdateGroup, onDeleteGroup, onTasksChanged }: Props) {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const group = groups.find((g) => g.id === groupId)
  const [tab, setTab] = useState<Tab>('tasks')
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupActionPending, setGroupActionPending] = useState(false)

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

  useEffect(() => {
    setGroupName(group?.name ?? '')
    setEditingGroupName(false)
    setGroupActionPending(false)
  }, [group?.id, group?.name])

  const saveGroupName = async (e: FormEvent) => {
    e.preventDefault()
    if (!group) return
    const trimmed = groupName.trim()
    if (!trimmed) return
    if (trimmed === group.name) {
      setEditingGroupName(false)
      return
    }

    setGroupActionPending(true)
    const saved = await onUpdateGroup(group.id, { name: trimmed })
    setGroupActionPending(false)
    if (saved) setEditingGroupName(false)
  }

  const deleteCurrentGroup = async () => {
    if (!group) return
    if (!confirm(`Delete "${group.name}" and all its tasks and notes?`)) return

    const next = groups.find((g) => g.id !== group.id)
    setGroupActionPending(true)
    const deleted = await onDeleteGroup(group.id)
    setGroupActionPending(false)
    if (deleted) navigate(next ? `/g/${next.id}` : '/', { replace: true })
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
        <div className="focus-current-group">
          <span className="focus-eyebrow">Current group</span>
          {editingGroupName ? (
            <form className="focus-group-edit" onSubmit={saveGroupName}>
              <span className="focus-dot" style={{ background: accent }} />
              <input
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setGroupName(group.name)
                    setEditingGroupName(false)
                  }
                }}
                disabled={groupActionPending}
                maxLength={80}
              />
              <button className="group-action" type="submit" disabled={groupActionPending} title="Save group name">
                ✓
              </button>
              <button
                className="group-action"
                type="button"
                disabled={groupActionPending}
                title="Cancel edit"
                onClick={() => {
                  setGroupName(group.name)
                  setEditingGroupName(false)
                }}
              >
                ×
              </button>
            </form>
          ) : (
            <div className="focus-group-title-row">
              <span className="focus-dot" style={{ background: accent }} />
              <h1>{group.name}</h1>
              <div className="focus-group-actions">
                <button
                  className="group-action"
                  type="button"
                  disabled={groupActionPending}
                  title="Edit group name"
                  onClick={() => setEditingGroupName(true)}
                >
                  ✎
                </button>
                <button
                  className="group-action danger"
                  type="button"
                  disabled={groupActionPending}
                  title="Delete group"
                  onClick={deleteCurrentGroup}
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <p className="focus-greeting">
            Welcome back, <span className="grad">{firstName}</span>
          </p>
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
        </div>
      </header>

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
