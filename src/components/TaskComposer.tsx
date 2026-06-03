import { useState } from 'react'
import type { Priority, Task } from '../types'
import { PRIORITY_META } from '../types'

interface Props {
  accent: string
  onCreate: (input: Partial<Task> & { title: string }) => Promise<void>
}

export default function TaskComposer({ accent, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState('')
  const [description, setDescription] = useState('')

  const reset = () => {
    setTitle('')
    setPriority('medium')
    setDue('')
    setDescription('')
    setExpanded(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    await onCreate({
      title: trimmed,
      priority,
      due_date: due || null,
      description: description.trim(),
    })
    reset()
  }

  return (
    <form className="composer" onSubmit={submit} style={{ ['--accent' as string]: accent }}>
      <div className="composer-row">
        <span className="composer-plus">+</span>
        <input
          className="composer-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Add a task and press Enter…"
          maxLength={280}
        />
      </div>

      {expanded && (
        <div className="composer-details">
          <div className="composer-field">
            <label>Priority</label>
            <div className="seg">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`seg-btn ${priority === p ? 'on' : ''}`}
                  style={priority === p ? { background: PRIORITY_META[p].color } : undefined}
                  onClick={() => setPriority(p)}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="composer-field">
            <label>Due</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>

          <textarea
            className="composer-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes / details (optional)"
            rows={2}
          />

          <div className="composer-actions">
            <button type="button" className="link-btn" onClick={reset}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              Add task
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
