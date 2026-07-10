import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Subtask, Task } from '../types'

interface UseTasksOptions {
  importantOnly?: boolean
}

export function useTasks(groupId: string | undefined, options: UseTasksOptions = {}) {
  const { user } = useAuth()
  const { importantOnly = false } = options
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user || (!groupId && !importantOnly)) {
      setTasks([])
      setLoading(false)
      return
    }

    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    query = importantOnly
      ? query.eq('user_id', user.id).eq('is_important', true)
      : query.eq('group_id', groupId)

    const { data, error } = await query
    if (error) setError(error.message)
    else setTasks(data as Task[])
    setLoading(false)
  }, [groupId, importantOnly, user])

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
        is_important: input.is_important ?? false,
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

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      setTasks((t) => {
        if (importantOnly && patch.is_important === false) return t.filter((x) => x.id !== id)
        return t.map((x) => (x.id === id ? { ...x, ...patch } : x))
      })
      const { error } = await supabase.from('tasks').update(patch).eq('id', id)
      if (error) setError(error.message)
    },
    [importantOnly],
  )

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

  const reorderTasks = useCallback(
    async (orderedTasks: Task[]) => {
      // Optimistically update local state with new positions
      const updated = orderedTasks.map((task, index) => ({
        ...task,
        position: index,
      }))
      setTasks(updated)

      // Persist only tasks whose position changed
      const changes = orderedTasks.filter((task, index) => task.position !== index)
      if (changes.length === 0) return

      // Batch update all changed positions to Supabase
      try {
        const updates = changes.map((task) => {
          const newPosition = orderedTasks.indexOf(task)
          return supabase.from('tasks').update({ position: newPosition }).eq('id', task.id)
        })
        const results = await Promise.all(updates)
        const hasError = results.some((r) => r.error)
        if (hasError) {
          setError('Failed to reorder tasks')
          // Reload to restore correct state
          await load()
        } else {
          setError(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Reorder failed')
        await load()
      }
    },
    [load],
  )

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
    reorderTasks,
    reload: load,
  }
}
