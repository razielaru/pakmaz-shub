import { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#2e7d32', '#c62828', '#1a3a5c', '#c8971a', '#6a1b9a']

export default function StatsCharts({ reports }) {
  const timelineData = useMemo(() => {
    const byMonth = {}
    reports.forEach(r => {
      const m = r.date?.slice(0, 7) || 'unknown'
      if (!byMonth[m]) byMonth[m] = { month: m, total: 0, ok: 0, issues: 0 }
      byMonth[m].total++
      if (r.e_status === 'תקין' && r.k_cert === 'כן') byMonth[m].ok++
      else byMonth[m].issues++
    })
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  }, [reports])

  const eruvPie = useMemo(() => {
    const counts = { תקין: 0, פסול: 0, 'לא רלוונטי': 0, 'לא ידוע': 0 }
    reports.forEach(r => { counts[r.e_status || 'לא ידוע']++ })
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  }, [reports])

  const inspectorData = useMemo(() => {
    const counts = {}
    reports.forEach(r => { if (r.inspector) counts[r.inspector] = (counts[r.inspector] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name, count }))
  }, [reports])

  if (!reports.length) return (
    <div className="text-center py-10 text-gray-400">
      <p className="text-4xl mb-2">📊</p>
      <p>אין נתונים להצגה</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Timeline */}
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-4">📈 דוחות לאורך זמן</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Heebo' }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => [v, n === 'ok' ? 'תקין' : n === 'issues' ? 'בעיות' : 'סה"כ']} />
            <Legend formatter={n => n === 'ok' ? 'תקין' : n === 'issues' ? 'בעיות' : 'סה"כ'} />
            <Line type="monotone" dataKey="total" stroke="#1a3a5c" strokeWidth={2} dot={{ r: 4 }} name="total" />
            <Line type="monotone" dataKey="ok" stroke="#2e7d32" strokeWidth={2} dot={{ r: 4 }} name="ok" />
            <Line type="monotone" dataKey="issues" stroke="#c62828" strokeWidth={2} dot={{ r: 4 }} name="issues" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eruv pie */}
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">🔵 התפלגות עירובים</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={eruvPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {eruvPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Inspector bar */}
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">👤 מספר דוחות לפי מבקר</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={inspectorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'Heebo' }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a3a5c" radius={[0, 4, 4, 0]} name="דוחות" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
