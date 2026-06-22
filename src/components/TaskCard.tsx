import type { Task } from '../types'
import { PRIORITY_META } from '../types'

interface Props {
  task: Task
  onOpen: () => void
  onDelete: (id: string) => void
  onDragStart: () => void
  onDragEnd: () => void
}

function fmtDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function TaskCard({ task, onOpen, onDelete, onDragStart, onDragEnd }: Props) {
  const total = task.subtasks.length
  const doneCount = task.subtasks.filter((s) => s.done).length
  const due = fmtDate(task.due_date)
  const subtitle = task.description.split('\n')[0]
  const priorityColor = PRIORITY_META[task.priority].color
  const images = task.images ?? []
  const coverImage = images[0]

  return (
    <article
      className="card"
      draggable
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault()
          if (confirm('Delete this task?')) onDelete(task.id)
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
    >
      {coverImage && (
        <div className="card-image">
          <img src={coverImage.dataUrl} alt="" />
        </div>
      )}

      <div className="card-top">
        <div className="card-titles">
          <h3 className="card-title">{task.title}</h3>
          {subtitle && <p className="card-sub">{subtitle}</p>}
        </div>
        <span className="card-menu" aria-hidden>
          ⋯
        </span>
      </div>

      <div className="card-foot">
        <div className="card-badges">
          {due && <span className="date-pill">{due}</span>}
          {images.length > 0 && <span className="image-count">{images.length} pic</span>}
          {doneCount > 0 && <span className="checklist-count">{doneCount}/{total}</span>}
        </div>
        <span
          className="prio-dot"
          style={{ color: priorityColor }}
          title={`${PRIORITY_META[task.priority].label} priority`}
        >
          ●
        </span>
      </div>
    </article>
  )
}
