import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useReports(filters = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['reports', user?.unit, filters],
    queryFn: async () => {
      let q = supabase.from('reports').select('*').order('date', { ascending: false })

      if (filters.unit) q = q.eq('unit', filters.unit)
      else if (user?.role !== 'pikud' && user?.role !== 'ugda') q = q.eq('unit', user.unit)

      if (filters.base) q = q.ilike('base', `%${filters.base}%`)
      if (filters.from) q = q.gte('date', filters.from)
      if (filters.to) q = q.lte('date', filters.to)
      if (filters.limit) q = q.limit(filters.limit)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  })
}

export function useBaseReports(base, unit) {
  return useQuery({
    queryKey: ['reports', 'base', base, unit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('unit', unit)
        .ilike('base', `%${base}%`)
        .order('date', { ascending: false })
        .limit(10)
      if (error) throw error
      return data || []
    },
    enabled: !!base && !!unit,
  })
}

export function useInsertReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (reportData) => {
      const { data, error } = await supabase.from('reports').insert(reportData).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}
