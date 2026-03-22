import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { logTaskAudit } from '../utils/audit'

function isMissingTasksTable(error) {
  return /relation|does not exist|unit_tasks/i.test(error?.message || '')
}

function isTaskPermissionError(error) {
  return /row-level security|permission denied|violates row-level security/i.test(error?.message || '')
}

export function useTasks(filters = {}) {
  const { user } = useAuth()
  const enabled = filters.enabled ?? true
  const selectFields = [
    'id',
    'unit',
    'assignee_name',
    'title',
    'description',
    'base',
    'priority',
    'status',
    'due_date',
    'created_by_name',
    'created_by_unit',
    'created_by_role',
    'completed_by',
    'completed_at',
    'created_at',
    'updated_at',
  ].join(', ')

  return useQuery({
    queryKey: ['unit-tasks', user?.unit, user?.role, filters],
    queryFn: async () => {
      let query = supabase
        .from('unit_tasks')
        .select(selectFields)
        .order('created_at', { ascending: false })

      if (filters.unit) query = query.eq('unit', filters.unit)
      else if (user?.role !== 'pikud' && user?.role !== 'ugda') query = query.eq('unit', user?.unit)

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.assignee) query = query.ilike('assignee_name', `%${filters.assignee}%`)

      const { data, error } = await query

      if (error) {
        if (isMissingTasksTable(error)) return []
        throw error
      }

      return data || []
    },
    enabled: !!user && enabled,
    staleTime: 1000 * 30,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('unit_tasks')
        .insert({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        if (isMissingTasksTable(error)) {
          throw new Error('טבלת המשימות עדיין לא קיימת. יש להריץ את עדכון ה-SQL החדש ב-Supabase.')
        }
        if (isTaskPermissionError(error)) {
          throw new Error('לחשבון הזה עדיין אין הרשאת שרת להוספת משימות. יש להפעיל can_manage_tasks ב-Supabase עבור היחידה.')
        }
        throw error
      }

      await logTaskAudit({
        taskId: data.id,
        unit: data.unit,
        action: 'task_created',
        actorName: payload.created_by_name,
        actorUnit: payload.created_by_unit,
        details: JSON.stringify({
          assignee_name: payload.assignee_name,
          title: payload.title,
          priority: payload.priority,
          due_date: payload.due_date,
        }),
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-tasks'] })
    },
  })
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, actorName }) => {
      const payload = {
        status,
        updated_at: new Date().toISOString(),
        completed_at: status === 'done' ? new Date().toISOString() : null,
        completed_by: status === 'done' ? actorName || null : null,
      }

      const { data, error } = await supabase
        .from('unit_tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingTasksTable(error)) {
          throw new Error('טבלת המשימות עדיין לא קיימת. יש להריץ את עדכון ה-SQL החדש ב-Supabase.')
        }
        if (isTaskPermissionError(error)) {
          throw new Error('לחשבון הזה עדיין אין הרשאת שרת לעדכון משימות. יש להפעיל can_manage_tasks ב-Supabase עבור היחידה.')
        }
        throw error
      }

      await logTaskAudit({
        taskId: data.id,
        unit: data.unit,
        action: 'task_status_updated',
        actorName,
        actorUnit: data.unit,
        details: JSON.stringify({ status }),
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-tasks'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, actorName, actorUnit, ...payload }) => {
      const { data, error } = await supabase
        .from('unit_tasks')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (isMissingTasksTable(error)) {
          throw new Error('טבלת המשימות עדיין לא קיימת. יש להריץ את עדכון ה-SQL החדש ב-Supabase.')
        }
        if (isTaskPermissionError(error)) {
          throw new Error('לחשבון הזה עדיין אין הרשאת שרת לעריכת משימות. יש להפעיל can_manage_tasks ב-Supabase עבור היחידה.')
        }
        throw error
      }

      await logTaskAudit({
        taskId: data.id,
        unit: data.unit,
        action: 'task_updated',
        actorName,
        actorUnit: actorUnit || data.unit,
        details: JSON.stringify({
          assignee_name: data.assignee_name,
          title: data.title,
          priority: data.priority,
          due_date: data.due_date,
          status: data.status,
        }),
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-tasks'] })
    },
  })
}
