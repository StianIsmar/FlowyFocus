import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Note } from '../types'

export function useNotes(groupId: string | undefined) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('group_id', groupId)
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setNotes(data as Note[])
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  const createNote = useCallback(async () => {
    if (!user || !groupId) return null
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, group_id: groupId, title: 'Untitled', content: '' })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return null
    }
    setNotes((n) => [data as Note, ...n])
    return data as Note
  }, [user, groupId])

  const updateNote = useCallback(
    async (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => {
      setNotes((n) =>
        n.map((x) => (x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x)),
      )
      const { error } = await supabase.from('notes').update(patch).eq('id', id)
      if (error) setError(error.message)
    },
    [],
  )

  const deleteNote = useCallback(async (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id))
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) setError(error.message)
  }, [])

  return { notes, loading, error, createNote, updateNote, deleteNote, reload: load }
}
