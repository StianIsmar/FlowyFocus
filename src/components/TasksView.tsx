import { useState } from 'react'
import { AlertCircle, Columns3, List, Rows2, Rows3 } from 'lucide-react'
import type { Group, Subtask, Task, TaskStatus } from '../types'
import { compareTaskPriority } from '../types'
import KanbanBoard from './KanbanBoard'
import TaskListView from './TaskListView'
import TaskEditor from './TaskEditor'
import { useWorkbench } from '../context/WorkbenchProvider'

interface Props {
  tasks: Task[]
  groups?: Group[]
  viewContext?: string
  canCreate?: boolean
  emptyMessage?: string
  onMove?: (task: Task, groupId: string) => Promise<boolean>
  onReorder?: (tasks: Task[]) => Promise<void>
  loading: boolean
  error: string | null
  saving?: boolean
  onRetry?: () => Promise<void>
  onCreate: (input: Partial<Task> & { title: string }) => Promise<void>
  onUpdate: (id: string, patch: Partial<Task>) => void
  onSetStatus: (task: Task, status: TaskStatus) => void
  onSetSubtasks: (task: Task, subtasks: Subtask[]) => void
  onDelete: (id: string) => void
}

type View = 'board' | 'list'
type Density = 'compact' | 'comfortable'

export default function TasksView({
  tasks: allTasks,
  loading,
  error,
  saving = false,
  onRetry,
  onCreate,
  onUpdate,
  onSetStatus,
  onSetSubtasks,
  onDelete,
  groups = [],
  canCreate = true,
  emptyMessage,
  onMove,
  onReorder,
}: Props) {
  const { pendingIds, remove } = useWorkbench()
  const tasks = allTasks.filter((task) => !pendingIds.includes(task.id)).sort(compareTaskPriority)
  const deleteWithUndo = (id: string) => {
    const task = tasks.find((item) => item.id === id)
    if (task) remove(task, () => onDelete(id))
  }
  const [view, setView] = useState<View>(() => {
    try { return localStorage.getItem('flowy-task-view') === 'list' ? 'list' : 'board' }
    catch { return 'board' }
  })
  const chooseView = (next: View) => {
    setView(next)
    try { localStorage.setItem('flowy-task-view', next) } catch {}
  }
  const [density, setDensity] = useState<Density>(() => {
    try { return localStorage.getItem('flowy-task-density') === 'comfortable' ? 'comfortable' : 'compact' }
    catch { return 'compact' }
  })
  const chooseDensity = (next: Density) => {
    setDensity(next)
    try { localStorage.setItem('flowy-task-density', next) } catch {}
  }
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingTask = editingId ? tasks.find((t) => t.id === editingId) ?? null : null

  return (
    <div className="tasks-view" data-density={density}>
      <div className="view-toolbar">
        <div className="view-options">
        <div className="seg" role="group" aria-label="Task view">
          <button
            className={view === 'board' ? 'seg-btn active' : 'seg-btn'}
            aria-pressed={view === 'board'}
            onClick={() => chooseView('board')}
          >
            <Columns3 size={15} /> Board
          </button>
          <button
            className={view === 'list' ? 'seg-btn active' : 'seg-btn'}
            aria-pressed={view === 'list'}
            onClick={() => chooseView('list')}
          >
            <List size={15} /> List
          </button>
        </div>
        <div className="seg density-control" role="group" aria-label="Task density">
          <button className={`seg-btn ${density === 'compact' ? 'active' : ''}`} title="Compact" aria-label="Compact" aria-pressed={density === 'compact'} onClick={() => chooseDensity('compact')}><Rows3 size={16} /></button>
          <button className={`seg-btn ${density === 'comfortable' ? 'active' : ''}`} title="Comfortable" aria-label="Comfortable" aria-pressed={density === 'comfortable'} onClick={() => chooseDensity('comfortable')}><Rows2 size={16} /></button>
        </div>
        </div>
        <span className="save-state" role="status">{saving ? 'Saving…' : error ? 'Not saved' : 'All changes saved'}</span>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} /> Couldn’t save: {error}
          {onRetry && <button className="link-btn" disabled={saving} onClick={onRetry}>Retry</button>}
        </div>
      )}

      {view === 'board' ? (
        <KanbanBoard
          tasks={tasks}
          loading={loading}
          onCreate={onCreate}
          canCreate={canCreate}
          emptyMessage={emptyMessage}
          onSetStatus={onSetStatus}
          onOpen={(t) => setEditingId(t.id)}
          onDelete={deleteWithUndo}
        />
      ) : (
        <TaskListView
          tasks={tasks}
          loading={loading}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onReorder={onReorder}
          canCreate={canCreate}
          emptyMessage={emptyMessage}
          onSetStatus={onSetStatus}
          onOpen={(t) => setEditingId(t.id)}
        />
      )}

      {editingTask && (
        <TaskEditor
          task={editingTask}
          groups={groups}
          onMove={onMove}
          error={error}
          saving={saving}
          onRetry={onRetry}
          onUpdate={onUpdate}
          onSetStatus={onSetStatus}
          onSetSubtasks={onSetSubtasks}
          onDelete={(id) => {
            deleteWithUndo(id)
            setEditingId(null)
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
