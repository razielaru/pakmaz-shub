// src/hooks/useBaseHistory.js
// שולף היסטוריה לפי בסיס ומחשב מגמה לפי חודש/שנה
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export function useBaseHistory(base) {
  return useQuery({
    queryKey: ['base-history', base],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('date, e_status, k_cert, r_mezuzot_missing, p_mix, reliability_score')
        .ilike('base', `%${base}%`)
        .order('date', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) return []

      // קיבוץ לפי חודש (YYYY-MM)
      const byMonth = {}
      data.forEach(r => {
        const month = r.date?.slice(0, 7) // "2025-03"
        if (!month) return
        if (!byMonth[month]) byMonth[month] = { total: 0, issues: 0, scores: [] }
        byMonth[month].total++

        const hasIssue =
          r.e_status === 'פסול' ||
          r.k_cert === 'לא' ||
          parseInt(r.r_mezuzot_missing || 0) > 0 ||
          r.p_mix === 'כן'
        if (hasIssue) byMonth[month].issues++
        if (r.reliability_score) byMonth[month].scores.push(r.reliability_score)
      })

      return Object.entries(byMonth).map(([month, d]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
        total: d.total,
        issues: d.issues,
        issueRate: d.total > 0 ? Math.round((d.issues / d.total) * 100) : 0,
        avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : null,
      }))
    },
    enabled: !!base && base.length > 1,
    staleTime: 1000 * 60 * 5,
  })
}

// חישוב כיוון מגמה
export function calcTrend(data) {
  if (!data || data.length < 2) return null
  const last3 = data.slice(-3)
  const first = last3[0]?.issueRate ?? 0
  const last  = last3[last3.length - 1]?.issueRate ?? 0
  const delta = last - first
  if (Math.abs(delta) < 3) return { dir: 'stable', label: '➡️ יציב', color: 'text-gray-500' }
  if (delta < 0) return { dir: 'improving', label: '📈 שיפור', color: 'text-green-600' }
  return { dir: 'declining', label: '📉 הידרדרות', color: 'text-red-600' }
}
