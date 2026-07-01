import { useTasks } from '../hooks/useTasks'
import type { Subtask, TaskStatus } from '../types'
import TasksView from './TasksView'

interface Props {
  onTasksChanged?: () => void
}

export default function ImportantFocus({ onTasksChanged }: Props) {
  const {
    tasks,
    loading,
    error,
    updateTask,
    setStatus,
    setSubtasks,
    deleteTask,
  } = useTasks(undefined, { importantOnly: true })

  const bump = onTasksChanged ?? (() => {})
  const updateTaskAndSync: typeof updateTask = async (id, patch) => {
    await updateTask(id, patch)
    bump()
  }
  const setStatusAndSync: typeof setStatus = async (task, status: TaskStatus) => {
    await setStatus(task, status)
    bump()
  }
  const setSubtasksAndSync = async (task: Parameters<typeof setSubtasks>[0], subtasks: Subtask[]) => {
    await setSubtasks(task, subtasks)
    bump()
  }
  const deleteTaskAndSync: typeof deleteTask = async (id) => {
    await deleteTask(id)
    bump()
  }

  return (
    <div className="focus" style={{ ['--accent' as string]: '#f59e0b' }}>
      <header className="focus-header">
        <div className="focus-current-group">
          <span className="focus-eyebrow">Virtual group</span>
          <div className="focus-group-title-row">
            <span className="focus-dot important-focus-dot">★</span>
            <h1>Most important</h1>
          </div>
          <p className="focus-greeting">Tasks marked important from every group.</p>
        </div>
      </header>

      <TasksView
        tasks={tasks}
        loading={loading}
        error={error}
        onCreate={async () => {}}
        onUpdate={updateTaskAndSync}
        onSetStatus={setStatusAndSync}
        onSetSubtasks={setSubtasksAndSync}
        onDelete={deleteTaskAndSync}
        canCreate={false}
        emptyMessage="No important tasks yet. Mark a task with the star toggle to show it here."
      />
    </div>
  )
}