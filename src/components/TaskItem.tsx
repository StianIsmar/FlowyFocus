import { useState } from 'react'
import type { Priority, Subtask, Task } from '../types'
import { PRIORITY_META } from '../types'

interface Props {
  task: Task
  onToggle: (task: Task) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onSubtasks: (task: Task, subtasks: Subtask[]) => void
  onDelete: (id: string) => void
}

function dueLabel(due: string | null): { text: string; tone: string } | null {
  if (!due) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return { text: `${-diff}d overdue`, tone: 'overdue' }
  if (diff === 0) return { text: 'Today', tone: 'today' }
  if (diff === 1) return { text: 'Tomorrow', tone: 'soon' }
  if (diff <= 7) return { text: `${diff}d`, tone: 'soon' }
  return { text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), tone: '' }
}

export default function TaskItem({ task, onToggle, onUpdate, onSubtasks, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [newSub, setNewSub] = useState('')
  const due = dueLabel(task.due_date)
  const subDone = task.subtasks.filter((s) => s.done).length

  const addSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    const text = newSub.trim()
    if (!text) return
    onSubtasks(task, [...task.subtasks, { id: crypto.randomUUID(), text, done: false }])
    setNewSub('')
  }

  const toggleSub = (id: string) =>
    onSubtasks(
      task,
      task.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    )

  const removeSub = (id: string) =>
    onSubtasks(task, task.subtasks.filter((s) => s.id !== id))

  return (
    <li className={`task ${task.is_done ? 'is-done' : ''}`}>
      <div className="task-main">
        <button
          className="check"
          aria-label={task.is_done ? 'Mark not done' : 'Mark done'}
          onClick={() => onToggle(task)}
          style={{ borderColor: PRIORITY_META[task.priority].color }}
        >
          {task.is_done && '✓'}
        </button>

        <div className="task-body" onClick={() => setOpen((o) => !o)}>
          <span className="task-title">{task.title}</span>
          <div className="task-badges">
            <span
              className="prio"
              style={{ color: PRIORITY_META[task.priority].color }}
              title={`${PRIORITY_META[task.priority].label} priority`}
            >
              ●
            </span>
            {due && <span className={`due ${due.tone}`}>{due.text}</span>}
            {task.subtasks.length > 0 && (
              <span className="sub-count">
                {subDone}/{task.subtasks.length}
              </span>
            )}
            {task.description && <span className="has-note" title="Has notes">≣</span>}
          </div>
        </div>

        <button className="icon-btn ghost" onClick={() => onDelete(task.id)} title="Delete">
          ✕
        </button>
      </div>

      {open && (
        <div className="task-expand">
          <div className="expand-controls">
            <label className="ec">
              Priority
              <select
                value={task.priority}
                onChange={(e) => onUpdate(task.id, { priority: e.target.value as Priority })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="ec">
              Due
              <input
                type="date"
                value={task.due_date ?? ''}
                onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
              />
            </label>
          </div>

          <textarea
            className="task-desc"
            defaultValue={task.description}
            placeholder="Add details…"
            rows={2}
            onBlur={(e) => {
              if (e.target.value !== task.description)
                onUpdate(task.id, { description: e.target.value })
            }}
          />

          <div className="subtasks">
            {task.subtasks.map((s) => (
              <div key={s.id} className={`subtask ${s.done ? 'done' : ''}`}>
                <button className="check sm" onClick={() => toggleSub(s.id)}>
                  {s.done && '✓'}
                </button>
                <span>{s.text}</span>
                <button className="icon-btn ghost sm" onClick={() => removeSub(s.id)}>
                  ✕
                </button>
              </div>
            ))}
            <form className="subtask-add" onSubmit={addSubtask}>
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="Add sub-task…"
              />
            </form>
          </div>
        </div>
      )}
    </li>
  )
}
