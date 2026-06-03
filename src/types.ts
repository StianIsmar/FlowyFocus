export type Priority = 'low' | 'medium' | 'high'

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

export interface Task {
  id: string
  user_id: string
  group_id: string
  title: string
  description: string
  priority: Priority
  due_date: string | null
  is_done: boolean
  subtasks: Subtask[]
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

export const GROUP_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#84cc16', // lime
]
