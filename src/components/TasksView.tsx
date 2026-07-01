import { useState } from 'react'
import type { Subtask, Task, TaskStatus } from '../types'
import KanbanBoard from './KanbanBoard'
import TaskListView from './TaskListView'
import TaskEditor from './TaskEditor'

interface Props {
  tasks: Task[]
  loading: boolean
  error: string | null
  onCreate: (input: Partial<Task> & { title: string }) => Promise<void>
  onUpdate: (id: string, patch: Partial<Task>) => void
  onSetStatus: (task: Task, status: TaskStatus) => void
  onSetSubtasks: (task: Task, subtasks: Subtask[]) => void
  onDelete: (id: string) => void
  canCreate?: boolean
  emptyMessage?: string
}

type View = 'board' | 'list'

export default function TasksView({
  tasks,
  loading,
  error,
  onCreate,
  onUpdate,
  onSetStatus,
  onSetSubtasks,
  onDelete,
  canCreate = true,
  emptyMessage,
}: Props) {
  const [view, setView] = useState<View>('board')
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingTask = editingId ? tasks.find((t) => t.id === editingId) ?? null : null

  return (
    <div className="tasks-view">
      <div className="view-toolbar">
        <div className="seg">
          <button
            className={view === 'board' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setView('board')}
          >
            ▦ Board
          </button>
          <button
            className={view === 'list' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setView('list')}
          >
            ☰ List
          </button>
        </div>
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
          onOpen={(t) => setEditingId(t.id)}
          canCreate={canCreate}
          emptyMessage={emptyMessage}
        />
      )}

      {editingTask && (
        <TaskEditor
          task={editingTask}
          onUpdate={onUpdate}
          onSetStatus={onSetStatus}
          onSetSubtasks={onSetSubtasks}
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
