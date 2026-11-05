import { useEffect, useRef, useState } from 'react'
import { Check, MoreHorizontal, Pencil, Timer, Trash2 } from 'lucide-react'
import type { Task, TaskStatus } from '../types'
import { STATUS_COLUMNS } from '../types'
import { useWorkbench } from '../context/WorkbenchProvider'
import PriorityBadge from './PriorityBadge'

interface Props {
  task: Task
  onOpen: () => void
  onDelete: (id: string) => void
  onSetStatus: (task: Task, status: TaskStatus) => void
  onDragStart: () => void
  onDragEnd: () => void
}

export default function TaskCard({ task, onOpen, onDelete, onSetStatus, onDragStart, onDragEnd }: Props) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const { focus } = useWorkbench()
  const total = task.subtasks.length
  const doneCount = task.subtasks.filter((subtask) => subtask.done).length
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const overdue = !!task.due_date && task.due_date < today && task.status !== 'done'
  const due = task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null

  useEffect(() => {
    if (!menu) return
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const close = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenu(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])

  return <article className={`card ${task.status === 'done' ? 'is-done' : ''}`} draggable={!menu} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; onDragStart() }} onDragEnd={onDragEnd}>
    <div className="card-top">
      <button className="card-titles card-open" onClick={onOpen}><h3 className="card-title">{task.title}</h3>{task.description && <p className="card-sub">{task.description.split('\n')[0]}</p>}</button>
      <button ref={menuButton} className="icon-btn card-menu-button" aria-label={`Actions for ${task.title}`} title="Task actions" aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>
      {menu && <div className="task-actions" ref={menuRef} onKeyDown={(event) => {
        if (event.key === 'Escape') { setMenu(false); menuButton.current?.focus() }
      }}>
        <button onClick={() => { setMenu(false); onOpen() }}><Pencil size={15} />Edit task</button>
        {task.status !== 'done' && <button onClick={() => { setMenu(false); focus(task, () => onSetStatus(task, 'done')) }}><Timer size={15} />Start focus</button>}
        {STATUS_COLUMNS.filter((column) => column.id !== task.status).map((column) => <button key={column.id} onClick={() => { setMenu(false); onSetStatus(task, column.id) }}><Check size={15} />{column.id === 'done' ? 'Complete' : `Move to ${column.label.toLowerCase()}`}</button>)}
        <button className="danger" onClick={() => { setMenu(false); onDelete(task.id) }}><Trash2 size={15} />Delete task</button>
      </div>}
    </div>
    {total > 0 && <div className="card-progress"><div className="cp-row"><span className="cp-label">Checklist</span><span className="cp-count">{doneCount}/{total}</span></div><div className="cp-track" role="progressbar" aria-label="Checklist completion" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={total}><div className="cp-bar" style={{ width: `${doneCount / total * 100}%` }} /></div></div>}
    <div className="card-foot"><span className={overdue ? 'date-pill due-overdue' : 'date-pill'}>{due ? `${overdue ? 'Overdue · ' : ''}${due}` : ''}</span><PriorityBadge priority={task.priority} /></div>
  </article>
}
