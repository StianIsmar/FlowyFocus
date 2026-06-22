import { useEffect, useRef, useState } from 'react'
import type { Priority, Subtask, Task, TaskImage, TaskStatus } from '../types'
import { STATUS_COLUMNS } from '../types'

const MAX_IMAGE_EDGE = 1600
const IMAGE_QUALITY = 0.82

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

async function fileToTaskImage(file: File): Promise<TaskImage> {
  const img = await readImage(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare image')
  ctx.fillStyle = '#0f1115'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY)
  return {
    id: crypto.randomUUID(),
    name: file.name || 'Pasted image',
    type: 'image/jpeg',
    dataUrl,
    created_at: new Date().toISOString(),
  }
}

interface Props {
  task: Task
  onUpdate: (id: string, patch: Partial<Task>) => void
  onSetStatus: (task: Task, status: TaskStatus) => void
  onSetSubtasks: (task: Task, subtasks: Subtask[]) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function TaskEditor({
  task,
  onUpdate,
  onSetStatus,
  onSetSubtasks,
  onDelete,
  onClose,
}: Props) {
  const [newSub, setNewSub] = useState('')
  const [imageError, setImageError] = useState<string | null>(null)
  const [isAddingImages, setIsAddingImages] = useState(false)
  const [isDropActive, setIsDropActive] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const images = task.images ?? []

  useEffect(() => {
    modalRef.current?.focus()
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

  const addImages = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) return
    setImageError(null)
    setIsAddingImages(true)
    try {
      const nextImages = await Promise.all(imageFiles.map(fileToTaskImage))
      onUpdate(task.id, { images: [...images, ...nextImages] })
    } catch {
      setImageError('Could not add that image. Try copying it again.')
    } finally {
      setIsAddingImages(false)
    }
  }

  const removeImage = (id: string) => {
    onUpdate(task.id, { images: images.filter((image) => image.id !== id) })
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files)
    if (!files.some((file) => file.type.startsWith('image/'))) return
    e.preventDefault()
    void addImages(files)
  }

  const onImageDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDropActive) setIsDropActive(true)
  }

  const onImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropActive(false)
  }

  const onImageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    if (!files.some((file) => file.type.startsWith('image/'))) {
      setImageError('Drop an image file here.')
      return
    }
    void addImages(files)
  }

  const confirmDelete = () => {
    if (confirm('Delete this task?')) onDelete(task.id)
  }

  const isEditableTarget = (el: EventTarget | null) => {
    const node = el as HTMLElement | null
    if (!node) return false
    const tag = node.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      // Commit any pending field edits (title/description save on blur) before closing.
      ;(document.activeElement as HTMLElement | null)?.blur()
      onClose()
      return
    }
    if (e.key === 'Enter' && !isEditableTarget(e.target)) {
      e.preventDefault()
      onClose()
      return
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
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <input
            className="modal-title"
            defaultValue={task.title}
            maxLength={280}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== task.title) onUpdate(task.id, { title: v })
            }}
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

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

        <div className="description-box">
          <textarea
            className="modal-desc"
            defaultValue={task.description}
            placeholder="Add details or paste a picture…"
            rows={3}
            onBlur={(e) => {
              if (e.target.value !== task.description)
                onUpdate(task.id, { description: e.target.value })
            }}
          />
          {images.length > 0 && (
            <div className="task-image-grid">
              {images.map((image) => (
                <figure key={image.id} className="task-image">
                  <a href={image.dataUrl} target="_blank" rel="noreferrer" aria-label="Open image">
                    <img src={image.dataUrl} alt={image.name} />
                  </a>
                  <button
                    className="icon-btn ghost sm image-remove"
                    onClick={() => removeImage(image.id)}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </figure>
              ))}
            </div>
          )}
          <div
            className={`paste-target ${isDropActive ? 'drop-active' : ''}`}
            tabIndex={0}
            onPaste={onPaste}
            onDragEnter={onImageDragOver}
            onDragOver={onImageDragOver}
            onDragLeave={onImageDragLeave}
            onDrop={onImageDrop}
          >
            {isAddingImages
              ? 'Adding picture…'
              : isDropActive
                ? 'Drop picture here'
                : 'Paste a picture here'}
          </div>
          {imageError && <p className="image-error">{imageError}</p>}
        </div>

        <div className="modal-subs">
          <div className="section-label">Checklist</div>
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
          <form className="subtask-add" onSubmit={addSub}>
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Add checklist item…"
            />
          </form>
        </div>

        <div className="modal-foot">
          <button className="link-btn danger" onClick={confirmDelete}>
            Delete task
          </button>          <button className="btn-primary" onClick={onClose}>
            Done
            <span className="enter-hint" aria-hidden>↵</span>
          </button>
        </div>
      </div>
    </div>
  )
}
