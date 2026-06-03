import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Group } from '../types'
import { GROUP_COLORS } from '../types'
import { useTasks } from '../hooks/useTasks'
import TaskComposer from './TaskComposer'
import TaskItem from './TaskItem'
import NotesPanel from './NotesPanel'

interface Props {
  groups: Group[]
  onUpdateGroup: (id: string, patch: Partial<Pick<Group, 'name' | 'color'>>) => void
  onDeleteGroup: (id: string) => void
}

type Tab = 'tasks' | 'notes'

export default function GroupFocus({ groups, onUpdateGroup, onDeleteGroup }: Props) {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const group = groups.find((g) => g.id === groupId)
  const [tab, setTab] = useState<Tab>('tasks')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const {
    tasks,
    loading,
    createTask,
    updateTask,
    toggleDone,
    setSubtasks,
    deleteTask,
  } = useTasks(groupId)

  const { open, done } = useMemo(
    () => ({
      open: tasks.filter((t) => !t.is_done),
      done: tasks.filter((t) => t.is_done),
    }),
    [tasks],
  )

  if (!group) {
    return (
      <div className="empty-state">
        <p className="muted">Group not found.</p>
      </div>
    )
  }

  const accent = group.color

  return (
    <div className="focus" style={{ ['--accent' as string]: accent }}>
      <header className="focus-header">
        <div className="focus-title">
          <span className="focus-dot" style={{ background: accent }} />
          <h1>{group.name}</h1>
          <span className="focus-count">{open.length} open</span>
        </div>
        <div className="focus-tabs">
          <button
            className={tab === 'tasks' ? 'tab active' : 'tab'}
            onClick={() => setTab('tasks')}
          >
            Tasks
          </button>
          <button
            className={tab === 'notes' ? 'tab active' : 'tab'}
            onClick={() => setTab('notes')}
          >
            Notes
          </button>
          <button
            className="icon-btn"
            title="Group settings"
            onClick={() => setSettingsOpen((s) => !s)}
          >
            ⚙
          </button>
        </div>
      </header>

      {settingsOpen && (
        <GroupSettings
          group={group}
          onUpdate={onUpdateGroup}
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => {
            onDeleteGroup(group.id)
            navigate('/', { replace: true })
          }}
        />
      )}

      {tab === 'tasks' ? (
        <div className="tasks">
          <TaskComposer accent={accent} onCreate={createTask} />

          {loading && tasks.length === 0 && <div className="muted small pad">Loading…</div>}

          {open.length === 0 && !loading && (
            <p className="muted pad">Nothing here yet. Add your first task above.</p>
          )}

          <ul className="task-list">
            {open.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={toggleDone}
                onUpdate={updateTask}
                onSubtasks={setSubtasks}
                onDelete={deleteTask}
              />
            ))}
          </ul>

          {done.length > 0 && (
            <details className="done-section">
              <summary>Completed ({done.length})</summary>
              <ul className="task-list">
                {done.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggle={toggleDone}
                    onUpdate={updateTask}
                    onSubtasks={setSubtasks}
                    onDelete={deleteTask}
                  />
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <NotesPanel groupId={group.id} accent={accent} />
      )}
    </div>
  )
}

function GroupSettings({
  group,
  onUpdate,
  onClose,
  onDeleted,
}: {
  group: Group
  onUpdate: Props['onUpdateGroup']
  onClose: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(group.name)

  return (
    <div className="group-settings">
      <input
        className="settings-name"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== group.name && onUpdate(group.id, { name: name.trim() })}
      />
      <div className="swatches">
        {GROUP_COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${c === group.color ? 'sel' : ''}`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            onClick={() => onUpdate(group.id, { color: c })}
          />
        ))}
      </div>
      <div className="settings-actions">
        <button
          className="link-btn danger"
          onClick={() => {
            if (confirm(`Delete "${group.name}" and all its tasks and notes?`)) {
              onDeleted()
            }
          }}
        >
          Delete group
        </button>
        <button className="link-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
