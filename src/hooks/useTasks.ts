import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Subtask, Task } from '../types'

interface UseTasksOptions {
  importantOnly?: boolean
  allGroups?: boolean
}

export function useTasks(groupId: string | undefined, options: UseTasksOptions = {}) {
  const { user } = useAuth()
  const { importantOnly = false, allGroups = false } = options
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingWrites, setPendingWrites] = useState(0)
  const retryAction = useRef<(() => Promise<unknown>) | null>(null)
  const retry = async () => { await retryAction.current?.() }

  const load = useCallback(async () => {
    if (!user || (!groupId && !importantOnly && !allGroups)) {
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

    if (importantOnly) query = query.eq('user_id', user.id).eq('is_important', true)
    else if (groupId) query = query.eq('group_id', groupId)

    const { data, error } = await query
    if (error) {
      setError(error.message)
      retryAction.current = load
    }
    else {
      setTasks((data ?? []) as Task[])
      setError(null)
      retryAction.current = null
    }
    setLoading(false)
  }, [groupId, importantOnly, allGroups, user])

  useEffect(() => {
    load()
    const refresh = () => { void load() }
    window.addEventListener('flowy-tasks-changed', refresh)
    return () => window.removeEventListener('flowy-tasks-changed', refresh)
  }, [load])

  const createTask = useCallback(
    async (input: Partial<Task> & { title: string }) => {
      const destination = groupId ?? input.group_id
      if (!user || !destination) throw new Error('Choose a group first')
      const payload = {
        user_id: user.id,
        group_id: destination,
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
      setPendingWrites((count) => count + 1)
      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single()
      setPendingWrites((count) => count - 1)
      if (error) {
        setError(error.message)
        throw new Error(error.message)
      }
      setError(null)
      setTasks((t) => [...t, data as Task])
    },
    [user, groupId, tasks.length],
  )

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      const previous = tasks.find((task) => task.id === id)
      setPendingWrites((count) => count + 1)
      setTasks((t) => {
        if (importantOnly && patch.is_important === false) return t.filter((x) => x.id !== id)
        return t.map((x) => (x.id === id ? { ...x, ...patch } : x))
      })
      const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('id').maybeSingle()
      setPendingWrites((count) => count - 1)
      if (error || !data) {
        if (previous) setTasks((current) => current.some((task) => task.id === id)
          ? current.map((task) => task.id === id ? previous : task)
          : [...current, previous])
        setError(error?.message ?? 'Task could not be saved. Check your access and try again.')
        retryAction.current = () => updateTask(id, patch)
        return false
      }
      setError(null)
      retryAction.current = null
      return true
    },
    [importantOnly, tasks],
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

  const moveTask = useCallback(
    async (task: Task, destinationGroupId: string) => {
      if (destinationGroupId === task.group_id) return false

      const { data: destinationTasks, error: positionError } = await supabase
        .from('tasks')
        .select('position')
        .eq('group_id', destinationGroupId)
        .order('position', { ascending: false })
        .limit(1)

      if (positionError) {
        setError(positionError.message)
        return false
      }

      const destinationPosition = (destinationTasks?.[0]?.position ?? -1) + 1
      const previousTasks = tasks
      if (importantOnly) {
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id
              ? { ...item, group_id: destinationGroupId, position: destinationPosition }
              : item,
          ),
        )
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({ group_id: destinationGroupId, position: destinationPosition })
        .eq('id', task.id)
        .select('id')
        .maybeSingle()

      if (error || !data) {
        if (importantOnly) setTasks(previousTasks)
        setError(error?.message ?? 'Could not move the task')
        return false
      }

      if (!importantOnly) {
        setTasks((current) => current.filter((item) => item.id !== task.id))
      }
      setError(null)
      return true
    },
    [importantOnly, tasks],
  )

  const deleteTask = useCallback(async (id: string) => {
    const previous = tasks.find((task) => task.id === id)
    setPendingWrites((count) => count + 1)
    setTasks((t) => t.filter((x) => x.id !== id))
    const { data, error } = await supabase.from('tasks').delete().eq('id', id).select('id').maybeSingle()
    setPendingWrites((count) => count - 1)
    if (error || !data) {
      if (previous) setTasks((current) => [...current, previous])
      setError(error?.message ?? 'Task could not be deleted. Check your access and try again.')
      retryAction.current = () => deleteTask(id)
    } else { setError(null); retryAction.current = null }
  }, [tasks])

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
    saving: pendingWrites > 0,
    retry,
    createTask,
    updateTask,
    toggleDone,
    setStatus,
    setSubtasks,
    moveTask,
    deleteTask,
    reorderTasks,
    reload: load,
  }
}
