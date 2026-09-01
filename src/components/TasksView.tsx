import { useEffect, useState } from 'react'
import { Columns3, List } from 'lucide-react'
import type { Group, Subtask, Task, TaskStatus } from '../types'
import KanbanBoard from './KanbanBoard'
import TaskListView from './TaskListView'
import TaskEditor from './TaskEditor'

interface Props {
  tasks: Task[]
  groups: Group[]
  viewContext: 'group' | 'important'
  loading: boolean
  error: string | null
  onCreate: (input: Partial<Task> & { title: string }) => Promise<void>
  onUpdate: (id: string, patch: Partial<Task>) => void
  onSetStatus: (task: Task, status: TaskStatus) => void
  onSetSubtasks: (task: Task, subtasks: Subtask[]) => void
  onMove: (task: Task, destinationGroupId: string) => Promise<boolean>
  onDelete: (id: string) => void
  onReorder?: (tasks: Task[]) => Promise<void>
  canCreate?: boolean
  emptyMessage?: string
}

type View = 'board' | 'list'

export default function TasksView({
  tasks,
  groups,
  viewContext,
  loading,
  error,
  onCreate,
  onUpdate,
  onSetStatus,
  onSetSubtasks,
  onMove,
  onDelete,
  onReorder,
  canCreate = true,
  emptyMessage,
}: Props) {
  const [view, setView] = useState<View>('board')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [moveMessage, setMoveMessage] = useState('')
  const editingTask = editingId ? tasks.find((t) => t.id === editingId) ?? null : null

  useEffect(() => {
    if (!moveMessage) return
    const timeout = window.setTimeout(() => setMoveMessage(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [moveMessage])

  const moveTask = async (task: Task, destinationGroupId: string) => {
    const moved = await onMove(task, destinationGroupId)
    if (moved) {
      const destination = groups.find((group) => group.id === destinationGroupId)
      setMoveMessage(`Moved to ${destination?.name ?? 'another group'}`)
    }
    return moved
  }

  return (
    <div className="tasks-view">
      <div className="view-toolbar">
        <div className="seg">
          <button
            className={view === 'board' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setView('board')}
          >
            <Columns3 size={14} aria-hidden /> Board
          </button>
          <button
            className={view === 'list' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setView('list')}
          >
            <List size={14} aria-hidden /> List
          </button>
        </div>
      </div>

      <div className="task-move-announcement" aria-live="polite">
        {moveMessage}
      </div>

      {error && (
        <div className="error-banner">
          ⚠ Couldn’t save: {error}
          <span className="error-hint">
            {' '}
            Re-run <code>supabase/schema.sql</code> in Supabase so the task <code>status</code>{' '}
            and <code>is_important</code> columns exist.
          </span>
        </div>
      )}

      {view === 'board' ? (
        <KanbanBoard
          tasks={tasks}
          loading={loading}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onSetStatus={onSetStatus}
          onOpen={(t) => setEditingId(t.id)}
          onDelete={onDelete}
          canCreate={canCreate}
          emptyMessage={emptyMessage}
        />
      ) : (
        <TaskListView
          tasks={tasks}
          loading={loading}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onSetStatus={onSetStatus}
          onReorder={onReorder}
          onOpen={(t) => setEditingId(t.id)}
          canCreate={canCreate}
          emptyMessage={emptyMessage}
        />
      )}

      {editingTask && (
        <TaskEditor
          task={editingTask}
          groups={groups}
          viewContext={viewContext}
          onUpdate={onUpdate}
          onSetStatus={onSetStatus}
          onSetSubtasks={onSetSubtasks}
          onMove={moveTask}
          onDelete={(id) => {
            onDelete(id)
            setEditingId(null)
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
