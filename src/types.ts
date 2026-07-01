export type Priority = 'low' | 'medium' | 'high'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Group {
  id: string
  user_id: string
  name: string
  color: string
  position: number
  created_at: string
}

export interface Subtask {
  id: string
  text: string
  done: boolean
}

export interface TaskImage {
  id: string
  name: string
  type: string
  dataUrl: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  group_id: string
  title: string
  description: string
  priority: Priority
  due_date: string | null
  is_important: boolean
  is_done: boolean
  status: TaskStatus
  subtasks: Subtask[]
  images: TaskImage[]
  position: number
  completed_at: string | null
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  group_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high: { label: 'High', color: '#ef4444' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low: { label: 'Low', color: '#3b82f6' },
}

export const STATUS_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To do', color: '#f59e0b' },
  { id: 'in_progress', label: 'In progress', color: '#3b82f6' },
  { id: 'done', label: 'Done', color: '#22c55e' },
]

// Order of the 6 radar-chart axes. Used by both the stats hook and StatHexagon
// so that the values array always lines up with the right axis.
export const STAT_AXES: { key: string; label: string }[] = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

export const GROUP_COLORS = [
  '#ec4899', // magenta/pink
  '#4f7cff', // electric blue
  '#b14bff', // purple
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
]
