import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useDeficits(units = []) {
  const { user } = useAuth()
  const targetUnits = units.length > 0 ? units : [user?.unit]
  const selectFields = 'id, unit, base, type, severity, description, status, notes, created_at, closed_at'

  return useQuery({
    queryKey: ['deficits', targetUnits],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deficit_tracking')
        .select(selectFields)
        .in('unit', targetUnits)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user && targetUnits.length > 0,
  })
}

export function useCloseDeficit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }) => {
      const { error } = await supabase
        .from('deficit_tracking')
        .update({ status: 'closed', notes, closed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deficits'] }),
  })
}

export function useDeficitStats(units = []) {
  const { user } = useAuth()
  const targetUnits = units.length > 0 ? units : [user?.unit]

  return useQuery({
    queryKey: ['deficit-stats', targetUnits],
    queryFn: async () => {
      const [openRes, closedRes] = await Promise.all([
        supabase.from('deficit_tracking').select('id', { count: 'exact', head: true }).in('unit', targetUnits).eq('status', 'open'),
        supabase.from('deficit_tracking').select('id', { count: 'exact', head: true }).in('unit', targetUnits).eq('status', 'closed'),
      ])
      return {
        open: openRes.count || 0,
        closed: closedRes.count || 0,
      }
    },
    enabled: !!user,
  })
}
