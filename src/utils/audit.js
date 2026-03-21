import { supabase } from '../supabaseClient'

export async function logAdminAudit({
  action,
  actorName,
  actorUnit,
  targetUnit,
  details,
}) {
  const { error } = await supabase.from('admin_audit_log').insert({
    action,
    actor_name: actorName || null,
    actor_unit: actorUnit || null,
    target_unit: targetUnit || null,
    details: details || null,
  })

  if (error && !/relation|does not exist/i.test(error.message || '')) {
    throw error
  }
}

export async function logTaskAudit({
  taskId,
  unit,
  action,
  actorName,
  actorUnit,
  details,
}) {
  const { error } = await supabase.from('task_audit_log').insert({
    task_id: taskId,
    unit,
    action,
    actor_name: actorName || null,
    actor_unit: actorUnit || null,
    details: details || null,
  })

  if (error && !/relation|does not exist/i.test(error.message || '')) {
    throw error
  }
}
