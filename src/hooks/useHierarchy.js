import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export function useHierarchy() {
  return useQuery({
    queryKey: ['hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hierarchy').select('*')
      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useChildUnits(parentUnit) {
  return useQuery({
    queryKey: ['hierarchy', 'children', parentUnit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hierarchy')
        .select('child_unit')
        .eq('parent_unit', parentUnit)
      if (error) throw error
      return data?.map((r) => r.child_unit) || []
    },
    enabled: !!parentUnit,
  })
}

export function useAccessibleUnits(unit, role) {
  return useQuery({
    queryKey: ['accessible-units', unit, role],
    queryFn: async () => {
      if (role === 'pikud') {
        // Admin sees all — fetch all units from unit_passwords
        const { data } = await supabase.from('unit_passwords').select('unit_name')
        return data?.map((r) => r.unit_name) || []
      }
      if (role === 'ugda' || role === 'hativa') {
        // Fetch children recursively (2 levels)
        const level1 = await supabase
          .from('hierarchy')
          .select('child_unit')
          .eq('parent_unit', unit)
        const children = level1.data?.map((r) => r.child_unit) || []

        const level2Promises = children.map((c) =>
          supabase.from('hierarchy').select('child_unit').eq('parent_unit', c)
        )
        const level2Results = await Promise.all(level2Promises)
        const grandchildren = level2Results.flatMap((r) => r.data?.map((x) => x.child_unit) || [])

        return [unit, ...children, ...grandchildren]
      }
      return [unit]
    },
    enabled: !!unit && !!role,
  })
}

export function useManageHierarchy() {
  const qc = useQueryClient()
  const add = useMutation({
    mutationFn: async ({ parent, child }) => {
      const { error } = await supabase.from('hierarchy').insert({ parent_unit: parent, child_unit: child })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hierarchy'] }),
  })
  const remove = useMutation({
    mutationFn: async (child) => {
      const { error } = await supabase.from('hierarchy').delete().eq('child_unit', child)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hierarchy'] }),
  })
  return { add, remove }
}
