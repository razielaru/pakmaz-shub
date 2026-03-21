import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export function useUnitAccounts() {
  return useQuery({
    queryKey: ['unit-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_passwords')
        .select('id, unit_name, login_email, auth_user_id, role, can_manage_tasks, updated_at')
        .order('unit_name', { ascending: true })

      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 30,
  })
}

export function useUpdateUnitAccount() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ unit_name, login_email, role, can_manage_tasks }) => {
      const { data, error } = await supabase
        .from('unit_passwords')
        .update({
          login_email: login_email?.trim().toLowerCase() || null,
          role,
          can_manage_tasks,
        })
        .eq('unit_name', unit_name)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-accounts'] })
    },
  })
}
