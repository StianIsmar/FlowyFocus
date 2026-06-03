import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { GROUP_COLORS, type Group } from '../types'

export function useGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setGroups(data as Group[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const createGroup = useCallback(
    async (name: string) => {
      if (!user) return null
      const color = GROUP_COLORS[groups.length % GROUP_COLORS.length]
      const position = groups.length
      const { data, error } = await supabase
        .from('groups')
        .insert({ user_id: user.id, name, color, position })
        .select()
        .single()
      if (error) {
        setError(error.message)
        return null
      }
      const group = data as Group
      setGroups((g) => [...g, group])
      return group
    },
    [user, groups.length],
  )

  const updateGroup = useCallback(
    async (id: string, patch: Partial<Pick<Group, 'name' | 'color'>>) => {
      setGroups((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      const { error } = await supabase.from('groups').update(patch).eq('id', id)
      if (error) {
        setError(error.message)
        load()
      }
    },
    [load],
  )

  const deleteGroup = useCallback(async (id: string) => {
    setGroups((g) => g.filter((x) => x.id !== id))
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) setError(error.message)
  }, [])

  return { groups, loading, error, createGroup, updateGroup, deleteGroup, reload: load }
}
