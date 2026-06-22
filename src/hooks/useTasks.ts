import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Subtask, Task } from '../types'

export function useTasks(groupId: string | undefined) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setTasks(data as Task[])
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  const createTask = useCallback(
    async (input: Partial<Task> & { title: string }) => {
      if (!user || !groupId) return
      const payload = {
        user_id: user.id,
        group_id: groupId,
        title: input.title,
        description: input.description ?? '',
        priority: input.priority ?? 'medium',
        due_date: input.due_date ?? null,
        subtasks: input.subtasks ?? [],
        status: input.status ?? 'todo',
        is_done: (input.status ?? 'todo') === 'done',
        position: tasks.length,
      }
      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single()
      if (error) {
        setError(error.message)
        return
      }
      setTasks((t) => [...t, data as Task])
    },
    [user, groupId, tasks.length],
  )

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const { error } = await supabase.from('tasks').update(patch).eq('id', id)
    if (error) setError(error.message)
  }, [])

  const toggleDone = useCallback(
    (task: Task) => {
      const is_done = !task.is_done
      return updateTask(task.id, {
        is_done,
        completed_at: is_done ? new Date().toISOString() : null,
      })
    },
    [updateTask],
  )

  const setStatus = useCallback(
    (task: Task, status: Task['status']) =>
      updateTask(task.id, {
        status,
        is_done: status === 'done',
        completed_at: status === 'done' ? new Date().toISOString() : null,
      }),
    [updateTask],
  )

  const setSubtasks = useCallback(
    (task: Task, subtasks: Subtask[]) => updateTask(task.id, { subtasks }),
    [updateTask],
  )

  const deleteTask = useCallback(async (id: string) => {
    setTasks((t) => t.filter((x) => x.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) setError(error.message)
  }, [])

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    toggleDone,
    setStatus,
    setSubtasks,
    deleteTask,
    reload: load,
  }
}
