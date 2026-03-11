// src/components/dashboard/CommandDashboard.jsx
import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useReports } from '../../hooks/useReports'
import { useDeficits } from '../../hooks/useDeficits'
import Spinner from '../ui/Spinner'

export default function CommandDashboard({ unit, accessibleUnits }) {
  const { data: reports = [], isLoading } = useReports()
  const { data: deficits = [] } = useDeficits(accessibleUnits)

  // עיבוד נתונים סטטיסטיים (תחליף ל-Pandas מקוד ה-Python)
  const stats = useMemo(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // ספירת דוחות וליקויים
    let totalIssues = 0
    const byUnit = {}
    const trend30Days = {}

    reports.forEach(r => {
      const isIssue = r.e_status === 'פסול' || r.k_cert === 'לא'
      if (isIssue) totalIssues++

      // קיבוץ לפי יחידה
      if (!byUnit[r.unit]) byUnit[r.unit] = { unit: r.unit, reports: 0, issues: 0, score: 100 }
      byUnit[r.unit].reports++
      if (isIssue) byUnit[r.unit].issues++

      // טרנד 30 יום
      const rDate = new Date(r.date)
      if (rDate >= thirtyDaysAgo) {
        const dateStr = rDate.toISOString().split('T')[0]
        if (!trend30Days[dateStr]) trend30Days[dateStr] = { date: dateStr, reports: 0, issues: 0 }
        trend30Days[dateStr].reports++
        if (isIssue) trend30Days[dateStr].issues++
      }
    })

    // חישוב ציונים בסיסי ליחידות
    const unitScores = Object.values(byUnit).map(u => ({
      ...u,
      score: Math.max(0, 100 - (u.issues * 15)) // לוגיקה פשטנית, אפשר להרחיב
    }))

    const avgScore = unitScores.length > 0 
      ? unitScores.reduce((acc, curr) => acc + curr.score, 0) / unitScores.length 
      : 0

    return {
      totalReports: reports.length,
      totalIssues,
      avgScore: Math.round(avgScore),
      unitScores,
      trendData: Object.values(trend30Days).sort((a, b) => a.date.localeCompare(b.date))
    }
  }, [reports])

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-l from-idf-blueDark to-idf-blue text-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2">🎯 Executive Summary – {unit}</h1>
        <p className="text-blue-200">לוח מעקב פיקודי - תמונת מצב אוגדתית לאיתור מוקדי סיכון</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center border-t-4 border-blue-500">
          <p className="text-gray-500 text-sm">יחידות כפופות</p>
          <p className="text-3xl font-bold text-gray-800">{accessibleUnits.length - 1}</p>
        </div>
        <div className="card text-center border-t-4 border-green-500">
          <p className="text-gray-500 text-sm">סה״כ דוחות</p>
          <p className="text-3xl font-bold text-gray-800">{stats.totalReports}</p>
        </div>
        <div className="card text-center border-t-4 border-red-500">
          <p className="text-gray-500 text-sm">ליקויים קריטיים</p>
          <p className="text-3xl font-bold text-red-600">{stats.totalIssues}</p>
        </div>
        <div className="card text-center border-t-4 border-amber-500">
          <p className="text-gray-500 text-sm">ציון אמינות ממוצע</p>
          <p className="text-3xl font-bold text-gray-800">{stats.avgScore}/100</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Comparison */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">📊 השוואת ביצועים בין חטיבות</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.unitScores}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="unit" tick={{fontSize: 12}} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#1a3a5c" name="ציון" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 30 Days Trend */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">📈 מגמת דיווחים וליקויים (30 יום)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="reports" stroke="#10b981" strokeWidth={3} name="דוחות" />
              <Line type="monotone" dataKey="issues" stroke="#ef4444" strokeWidth={3} name="ליקויים" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
