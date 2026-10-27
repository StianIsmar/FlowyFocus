import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Circle, Plus, Timer } from 'lucide-react'
import type { Group, Task } from '../types'
import { useTasks } from '../hooks/useTasks'
import { useWorkbench } from '../context/WorkbenchProvider'
import TaskEditor from './TaskEditor'

interface Props {
  groups: Group[]
  stats: Record<string, number[]>
  loading?: boolean
  onTasksChanged?: () => void
}

export default function Dashboard({ groups, loading: groupsLoading, onTasksChanged }: Props) {
  const { tasks: allTasks, loading, error, createTask, updateTask, setStatus, setSubtasks, deleteTask, retry, saving: writing } = useTasks(undefined, { allGroups: true })
  const { focus, pendingIds, remove } = useWorkbench()
  const [draft, setDraft] = useState('')
  const [groupId, setGroupId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const tasks = allTasks.filter((task) => !pendingIds.includes(task.id) && groups.some((group) => group.id === task.group_id))
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const open = tasks.filter((task) => task.status !== 'done')
  const due = open.filter((task) => task.due_date && task.due_date <= today).sort((first, second) => first.due_date!.localeCompare(second.due_date!))
  const continuing = open.filter((task) => task.status === 'in_progress')
  const overdue = due.filter((task) => task.due_date! < today).length
  const editing = tasks.find((task) => task.id === editingId)
  const destination = groups.some((group) => group.id === groupId) ? groupId : groups[0]?.id ?? ''
  const complete = async (task: Task) => { const succeeded = await setStatus(task, 'done'); onTasksChanged?.(); return succeeded }

  const capture = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim() || !destination || saving) return
    setSaving(true)
    try {
      await createTask({ title: draft.trim(), group_id: destination })
      setDraft('')
      onTasksChanged?.()
    } catch { return }
    finally { setSaving(false) }
  }

  const taskSection = (title: string, items: Task[], empty: string) => (
    <section className="work-section">
      <header className="work-section-head"><h2>{title} <span>{items.length}</span></h2></header>
      {loading && allTasks.length === 0 ? <p className="section-empty" role="status">Loading tasks…</p> : items.length === 0 ? <p className="section-empty">{empty}</p> : (
        <ul className="work-task-list">
          {(expanded[title] ? items : items.slice(0, 5)).map((task) => {
            const group = groups.find((item) => item.id === task.group_id)
            return <li className="work-task" key={task.id}>
              <button className="icon-btn task-complete" title={`Complete ${task.title}`} aria-label={`Complete ${task.title}`} onClick={() => complete(task)}><Circle size={19} /><Check className="check-hover" size={14} /></button>
              <button className="work-task-main" onClick={() => setEditingId(task.id)}><strong>{task.title}</strong><span><i className="group-dot" style={{ background: group?.color }} />{group?.name}{task.due_date && <span className={task.due_date < today ? 'due-overdue' : ''}>{task.due_date < today ? 'Overdue · ' : ''}{task.due_date === today ? 'Today' : new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}</span></button>
              <button className="icon-btn" aria-label={`Focus on ${task.title}`} title="Start focus session" onClick={() => focus(task, () => complete(task))}><Timer size={17} /></button>
            </li>
          })}
        </ul>
      )}
      {items.length > 5 && <button className="link-btn" onClick={() => setExpanded({ ...expanded, [title]: !expanded[title] })}>{expanded[title] ? 'Show less' : `Show all ${items.length}`}</button>}
    </section>
  )

  return (
    <div className="dashboard workbench">
      <header className="dash-head workbench-head"><div><span className="focus-eyebrow">Your workbench</span><h1>Today</h1></div><time dateTime={today}>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</time></header>
      <div className="work-summary"><span><b>{open.length}</b> open tasks</span><span><b>{continuing.length}</b> in progress</span>{overdue > 0 && <span className="due-overdue"><b>{overdue}</b> overdue</span>}</div>
      <form className="quick-capture" onSubmit={capture}>
        <Plus size={19} aria-hidden="true" />
        <input aria-label="New task title" placeholder="What needs doing?" maxLength={280} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={groups.length === 0 || saving} />
        <select aria-label="Task group" value={destination} onChange={(event) => setGroupId(event.target.value)} disabled={groups.length === 0 || saving}>{groups.length === 0 && <option value="">No groups</option>}{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
        <button className="btn-primary" disabled={!draft.trim() || !destination || saving}><Plus size={16} />{saving ? 'Saving…' : 'Add task'}</button>
      </form>
      {error && <div className="error-banner" role="alert"><span>{error}</span><button className="link-btn" disabled={writing} onClick={retry}>Retry</button></div>}
      <div className="work-columns">{taskSection('Due today', due, 'Nothing due. A little room to think.')}{taskSection('Continue', continuing, 'No tasks in progress.')}</div>
      <section className="work-section group-overview"><header className="work-section-head"><h2>Groups <span>{groups.length}</span></h2><span className="muted small">Open / total</span></header>
        {groupsLoading ? <p className="section-empty">Loading groups…</p> : groups.length === 0 ? <p className="section-empty">No groups yet.</p> : groups.map((group) => {
          const groupTasks = tasks.filter((task) => task.group_id === group.id)
          const done = groupTasks.filter((task) => task.status === 'done').length
          const percent = groupTasks.length ? done / groupTasks.length * 100 : 0
          return <Link className="group-overview-row" to={`/g/${group.id}`} key={group.id}><span className="group-dot" style={{ background: group.color }} /><strong>{group.name}</strong><span className="group-progress" role="progressbar" aria-label={`${group.name} completion`} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></span><span className="group-count">{groupTasks.length - done} <span>/ {groupTasks.length}</span></span><ArrowRight size={16} /></Link>
        })}
      </section>
      {editing && <TaskEditor task={editing} saving={writing} error={error} onRetry={retry} onUpdate={async (id, patch) => { await updateTask(id, patch); onTasksChanged?.() }} onSetStatus={async (task, status) => { await setStatus(task, status); onTasksChanged?.() }} onSetSubtasks={setSubtasks} onDelete={(id) => { remove(editing, async () => { await deleteTask(id); onTasksChanged?.() }); setEditingId(null) }} onClose={() => setEditingId(null)} />}
    </div>
  )
}
