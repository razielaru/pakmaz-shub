import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useReports(filters = {}) {
  const { user } = useAuth()
  const selectFields = filters.select || '*'

  return useQuery({
    queryKey: ['reports', user?.unit, user?.role, selectFields, filters],
    queryFn: async () => {
      const applyFilters = (query) => {
        let next = query.order('date', { ascending: false })

        if (filters.unit) next = next.eq('unit', filters.unit)
        else if (user?.role !== 'pikud' && user?.role !== 'ugda') next = next.eq('unit', user.unit)

        if (filters.base) next = next.ilike('base', `%${filters.base}%`)
        if (filters.from) next = next.gte('date', filters.from)
        if (filters.to) next = next.lte('date', filters.to)
        if (filters.limit) next = next.limit(filters.limit)

        return next
      }

      let q = applyFilters(supabase.from('reports').select(selectFields))
      let { data, error } = await q

      if (error && selectFields !== '*' && /column|does not exist|schema cache/i.test(error.message || '')) {
        const fallbackQuery = applyFilters(supabase.from('reports').select('*'))
        const fallbackResult = await fallbackQuery
        data = fallbackResult.data
        error = fallbackResult.error
      }

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
    mutationFn: async (payload) => {
      const normalizedPayload = payload?.reportData ? payload : { reportData: payload, auditEntry: null }
      const { reportData, auditEntry } = normalizedPayload
      let insertResult = await supabase.from('reports').insert(reportData).select().single()

      if (insertResult.error && /column/i.test(insertResult.error.message || '')) {
        const advancedFields = new Set([
          'gps_distance_km',
          'gps_accuracy_meters',
          'gps_reference_source',
          'gps_status',
          'gps_suspicious',
          'device_label',
          'device_platform',
          'device_user_agent',
          'evidence_photo_url',
          'latitude',
          'longitude',
        ])

        const legacyPayload = Object.fromEntries(
          Object.entries(reportData).filter(([key]) => !advancedFields.has(key))
        )

        insertResult = await supabase.from('reports').insert(legacyPayload).select().single()
      }

      const { data, error } = insertResult
      if (error) throw error

      if (auditEntry) {
        const { error: auditError } = await supabase.from('report_audit_log').insert({
          ...auditEntry,
          report_id: data.id,
        })
        if (auditError && !/relation|column/i.test(auditError.message || '')) {
          throw auditError
        }
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['base-registry'] })
      qc.invalidateQueries({ queryKey: ['report-audit-log'] })
    },
  })
}
