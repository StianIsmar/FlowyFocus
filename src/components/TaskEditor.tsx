import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Timer, Trash2, X } from 'lucide-react'
import type { Group, Priority, Subtask, Task, TaskStatus } from '../types'
import { STATUS_COLUMNS } from '../types'
import { useWorkbench } from '../context/WorkbenchProvider'

interface Props {
  task: Task
  onUpdate: (id: string, patch: Partial<Task>) => void
  onSetStatus: (task: Task, status: TaskStatus) => void
  onSetSubtasks: (task: Task, subtasks: Subtask[]) => void
  onDelete: (id: string) => void
  onClose: () => void
  groups?: Group[]
  onMove?: (task: Task, groupId: string) => Promise<boolean>
  error?: string | null
  saving?: boolean
  onRetry?: () => Promise<void>
}

export default function TaskEditor({
  task,
  onUpdate,
  onSetStatus,
  onSetSubtasks,
  onDelete,
  onClose,
  groups = [],
  onMove,
  error,
  saving = false,
  onRetry,
}: Props) {
  const [newSub, setNewSub] = useState('')
  const [destination, setDestination] = useState('')
  const [moving, setMoving] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const { focus } = useWorkbench()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    modalRef.current?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])

  const addSub = (e: React.FormEvent) => {
    e.preventDefault()
    const text = newSub.trim()
    if (!text) return
    onSetSubtasks(task, [...task.subtasks, { id: crypto.randomUUID(), text, done: false }])
    setNewSub('')
  }
  const toggleSub = (id: string) =>
    onSetSubtasks(
      task,
      task.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    )
  const removeSub = (id: string) =>
    onSetSubtasks(task, task.subtasks.filter((s) => s.id !== id))

  const confirmDelete = () => {
    onDelete(task.id)
  }

  const isEditableTarget = (el: EventTarget | null) => {
    const node = el as HTMLElement | null
    if (!node) return false
    const tag = node.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'Tab') {
      const controls = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? []).filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === modalRef.current)) { e.preventDefault(); first?.focus() }
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && !isEditableTarget(e.target)) {
      e.preventDefault()
      confirmDelete()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${task.title}`}
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <input
            className="modal-title"
            aria-label="Task title"
            defaultValue={task.title}
            maxLength={280}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== task.title) onUpdate(task.id, { title: v })
            }}
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-options">
          <label><input type="checkbox" checked={task.is_important} onChange={(event) => onUpdate(task.id, { is_important: event.target.checked })} />Important</label>
          <span className="save-state" role="status">{saving ? 'Saving…' : error ? 'Not saved' : 'All changes saved'}</span>
        </div>
        {error && <div className="error-banner" role="alert">{error}{onRetry && <button className="link-btn" onClick={onRetry} disabled={saving}>Retry</button>}</div>}

        <div className="modal-grid">
          <label className="mf">
            Status
            <select
              value={task.status}
              onChange={(e) => onSetStatus(task, e.target.value as TaskStatus)}
            >
              {STATUS_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mf">
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
          <label className="mf">
            Due
            <input
              type="date"
              value={task.due_date ?? ''}
              onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
            />
          </label>
        </div>

        <textarea
          className="modal-desc"
          aria-label="Task description"
          defaultValue={task.description}
          placeholder="Add details…"
          rows={3}
          onBlur={(e) => {
            if (e.target.value !== task.description)
              onUpdate(task.id, { description: e.target.value })
          }}
        />

        <div className="modal-subs">
          <div className="section-label">Checklist</div>
          {task.subtasks.map((s) => (
            <div key={s.id} className={`subtask ${s.done ? 'done' : ''}`}>
              <button className="check sm" aria-label={`${s.done ? 'Uncheck' : 'Complete'} ${s.text}`} aria-pressed={s.done} onClick={() => toggleSub(s.id)}>
                {s.done && <Check size={13} />}
              </button>
              <span>{s.text}</span>
              <button className="icon-btn ghost sm" aria-label={`Remove ${s.text}`} title="Remove checklist item" onClick={() => removeSub(s.id)}>
                <X size={13} />
              </button>
            </div>
          ))}
          <form className="subtask-add" onSubmit={addSub}>
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Add checklist item…"
              aria-label="New checklist item"
            />
            <button className="icon-btn" aria-label="Add checklist item" title="Add checklist item" disabled={!newSub.trim()}><Check size={16} /></button>
          </form>
        </div>

        {onMove && groups.some((group) => group.id !== task.group_id) && <form className="move-task-form" onSubmit={async (event) => {
          event.preventDefault()
          if (!destination || moving) return
          setMoving(true)
          try { if (await onMove(task, destination)) onClose() }
          finally { setMoving(false) }
        }}>
          <select aria-label="Move to group" value={destination} onChange={(event) => setDestination(event.target.value)} disabled={moving}>
            <option value="">Move to group…</option>
            {groups.filter((group) => group.id !== task.group_id).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <button className="btn-primary" disabled={!destination || moving}><ArrowRight size={15} />{moving ? 'Moving…' : 'Move'}</button>
        </form>}

        <div className="modal-foot">
          <button className="link-btn danger" onClick={confirmDelete}>
            <Trash2 size={14} /> Delete task
          </button>
          {task.status !== 'done' && <button className="link-btn" onClick={() => { focus(task, () => onSetStatus(task, 'done')); onClose() }}><Timer size={15} /> Start focus</button>}
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
