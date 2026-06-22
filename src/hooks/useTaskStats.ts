import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'

// Index of each status/priority within the STAT_AXES values array.
const AXIS_INDEX: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  high: 3,
  medium: 4,
  low: 5,
}

export function useTaskStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.from('tasks').select('group_id, status, priority')
    if (error) {
      setLoading(false)
      return
    }
    const map: Record<string, number[]> = {}
    for (const row of data as { group_id: string; status: string; priority: string }[]) {
      const arr = map[row.group_id] ?? (map[row.group_id] = [0, 0, 0, 0, 0, 0])
      const si = AXIS_INDEX[row.status]
      if (si !== undefined) arr[si]++
      const pi = AXIS_INDEX[row.priority]
      if (pi !== undefined) arr[pi]++
    }
    setStats(map)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { stats, loading, reload: load }
}
