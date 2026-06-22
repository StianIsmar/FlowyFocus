import { useState } from 'react'
import type { Task, TaskStatus } from '../types'
import { STATUS_COLUMNS } from '../types'
import TaskCard from './TaskCard'

interface Props {
  tasks: Task[]
  loading: boolean
  onCreate: (input: Partial<Task> & { title: string }) => Promise<void>
  onSetStatus: (task: Task, status: TaskStatus) => void
  onOpen: (task: Task) => void
  onDelete: (id: string) => void
}

export default function KanbanBoard({ tasks, loading, onCreate, onSetStatus, onOpen, onDelete }: Props) {
  const [addingCol, setAddingCol] = useState<TaskStatus | null>(null)
  const [draft, setDraft] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TaskStatus | null>(null)

  const submitAdd = async (status: TaskStatus) => {
    const title = draft.trim()
    setDraft('')
    setAddingCol(null)
    if (title) await onCreate({ title, status })
  }

  const drop = (status: TaskStatus) => {
    setOverCol(null)
    if (!dragId) return
    const t = tasks.find((x) => x.id === dragId)
    if (t && t.status !== status) onSetStatus(t, status)
    setDragId(null)
  }

  return (
    <div className="board">
      {STATUS_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id)
        return (
          <section
            key={col.id}
            className={`board-col ${overCol === col.id ? 'drop-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(col.id)
            }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={() => drop(col.id)}
          >
            <header className="col-head">
              <span className="col-title">
                <span className="col-dot" style={{ background: col.color, color: col.color }} />
                {col.label} <span className="col-count">({colTasks.length})</span>
              </span>
              <button
                className="col-add"
                onClick={() => {
                  setAddingCol(col.id)
                  setDraft('')
                }}
              >
                + Add task
              </button>
            </header>

            {addingCol === col.id && (
              <form
                className="col-add-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitAdd(col.id)
                }}
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Task title, then Enter…"
                  onBlur={() => submitAdd(col.id)}
                  maxLength={280}
                />
              </form>
            )}

            <div className="col-cards">
              {colTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onOpen={() => onOpen(t)}
                  onDelete={onDelete}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                />
              ))}
              {colTasks.length === 0 && addingCol !== col.id && (
                <button className="col-empty" onClick={() => setAddingCol(col.id)}>
                  + Add a task
                </button>
              )}
            </div>
          </section>
        )
      })}

      {loading && tasks.length === 0 && <div className="muted small pad">Loading…</div>}
    </div>
  )
}
