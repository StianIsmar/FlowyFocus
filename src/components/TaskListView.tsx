import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Plus, Star, Timer } from 'lucide-react'
import { useWorkbench } from '../context/WorkbenchProvider'
import type { Task } from '../types'
import { PRIORITY_META } from '../types'

interface Props {
  tasks: Task[]
  loading: boolean
  onCreate: (input: Partial<Task> & { title: string }) => Promise<void>
  onUpdate: (id: string, patch: Partial<Task>) => void
  onSetStatus: (task: Task, status: Task['status']) => void
  onReorder?: (tasks: Task[]) => Promise<void>
  onOpen: (task: Task) => void
  canCreate?: boolean
  emptyMessage?: string
}

function fmtDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export default function TaskListView({
  tasks,
  loading,
  onCreate,
  onUpdate,
  onSetStatus,
  onReorder,
  onOpen,
  canCreate = true,
  emptyMessage = 'No tasks yet. Add one above.',
}: Props) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const { focus } = useWorkbench()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const open = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const moveBy = (task: Task, offset: number) => {
    const items = task.status === 'done' ? done : open
    const index = items.findIndex((item) => item.id === task.id)
    const target = items[index + offset]
    if (!target || !onReorder) return
    const reordered = reorderWithin(items, task.id, target.id)
    void onReorder(task.status === 'done' ? [...open, ...reordered] : [...reordered, ...done])
  }

  const reorderWithin = (items: Task[], draggedId: string, targetId: string) => {
    const from = items.findIndex((task) => task.id === draggedId)
    const to = items.findIndex((task) => task.id === targetId)
    if (from < 0 || to < 0 || from === to) return items

    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }

  const dropOnOpenTask = async (targetId: string) => {
    if (!dragId || !onReorder) return
    const nextOpen = reorderWithin(open, dragId, targetId)
    await onReorder([...nextOpen, ...done])
    setDragId(null)
    setDragOverId(null)
  }

  const dropOnDoneTask = async (targetId: string) => {
    if (!dragId || !onReorder) return
    const nextDone = reorderWithin(done, dragId, targetId)
    await onReorder([...open, ...nextDone])
    setDragId(null)
    setDragOverId(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = draft.trim()
    if (!title || saving) return
    setSaving(true)
    try { await onCreate({ title }); setDraft('') }
    catch { return }
    finally { setSaving(false) }
  }

  return (
    <div className="list-view">
      {canCreate && (
        <form className="list-add" onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a task and press Enter…"
            maxLength={280}
            aria-label="New task title"
            disabled={saving}
          />
          <button className="btn-primary" type="submit" disabled={!draft.trim() || saving}>
            <Plus size={15} /> {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
      )}

      {loading && tasks.length === 0 && <div className="muted small pad">Loading…</div>}
      {open.length === 0 && done.length === 0 && !loading && <p className="muted pad">{emptyMessage}</p>}

      <ul className="todo-list">
        {open.map((t) => (
          <li
            key={t.id}
            className={`todo-row ${dragOverId === t.id ? 'drag-over' : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer!.effectAllowed = 'move'
              setDragId(t.id)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverId(t.id)
            }}
            onDragLeave={() => setDragOverId((id) => (id === t.id ? null : id))}
            onDrop={() => dropOnOpenTask(t.id)}
            onDragEnd={() => {
              setDragId(null)
              setDragOverId(null)
            }}
          >
            <button
              className="check"
              onClick={() => onSetStatus(t, 'done')}
              aria-label="Complete task"
            />
            <button className="todo-main" onClick={() => onOpen(t)}>
              <span className="todo-title">{t.title}</span>
              {t.due_date && <span className={`todo-due ${t.due_date < today ? 'due-overdue' : ''}`}>{t.due_date < today ? 'Overdue · ' : ''}{fmtDate(t.due_date)}</span>}
            </button>
            <button className="icon-btn list-focus" title="Start focus session" aria-label={`Focus on ${t.title}`} onClick={() => focus(t, () => onSetStatus(t, 'done'))}><Timer size={16} /></button>
            {onReorder && <span className="reorder-actions"><button className="icon-btn" title="Move up" aria-label={`Move ${t.title} up`} disabled={open[0].id === t.id} onClick={() => moveBy(t, -1)}><ArrowUp size={13} /></button><button className="icon-btn" title="Move down" aria-label={`Move ${t.title} down`} disabled={open[open.length - 1].id === t.id} onClick={() => moveBy(t, 1)}><ArrowDown size={13} /></button></span>}
            <button
              className={t.is_important ? 'important-toggle active' : 'important-toggle'}
              type="button"
              aria-label={t.is_important ? 'Unmark as very important' : 'Mark as very important'}
              aria-pressed={t.is_important}
              title={t.is_important ? 'Very important' : 'Mark as very important'}
              onClick={() => onUpdate(t.id, { is_important: !t.is_important })}
            >
              <Star size={15} fill={t.is_important ? 'currentColor' : 'none'} />
            </button>
            <span
              className="prio-dot"
              style={{ color: PRIORITY_META[t.priority].color }}
              title={`${PRIORITY_META[t.priority].label} priority`}
            >
              ●
            </span>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <details className="done-section">
          <summary>Completed ({done.length})</summary>
          <ul className="todo-list">
            {done.map((t) => (
              <li
                key={t.id}
                className={`todo-row done ${dragOverId === t.id ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer!.effectAllowed = 'move'
                  setDragId(t.id)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverId(t.id)
                }}
                onDragLeave={() => setDragOverId((id) => (id === t.id ? null : id))}
                onDrop={() => dropOnDoneTask(t.id)}
                onDragEnd={() => {
                  setDragId(null)
                  setDragOverId(null)
                }}
              >
                <button
                  className="check checked"
                  onClick={() => onSetStatus(t, 'todo')}
                  aria-label="Reopen task"
                >
                  <Check size={15} />
                </button>
                <button className="todo-main" onClick={() => onOpen(t)}>
                  <span className="todo-title">{t.title}</span>
                </button>
                <button
                  className={t.is_important ? 'important-toggle active' : 'important-toggle'}
                  type="button"
                  aria-label={t.is_important ? 'Unmark as very important' : 'Mark as very important'}
                  aria-pressed={t.is_important}
                  title={t.is_important ? 'Very important' : 'Mark as very important'}
                  onClick={() => onUpdate(t.id, { is_important: !t.is_important })}
                >
                  <Star size={15} fill={t.is_important ? 'currentColor' : 'none'} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
