// src/components/dashboard/BaseHistoryModal.jsx
// מודאל היסטוריה + גרף מגמה לבסיס ספציפי
import { useBaseHistory, calcTrend } from '../../hooks/useBaseHistory'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import Spinner from '../ui/Spinner'

export default function BaseHistoryModal({ base, onClose }) {
  const { data = [], isLoading } = useBaseHistory(base)
  const trend = calcTrend(data)

  // סיכום כולל
  const totalReports = data.reduce((s, d) => s + d.total, 0)
  const totalIssues  = data.reduce((s, d) => s + d.issues, 0)
  const overallRate  = totalReports > 0 ? Math.round((totalIssues / totalReports) * 100) : 0
  const lastIssueRate = data.at(-1)?.issueRate ?? 0
  const peakMonth = data.reduce((best, d) => d.issues > (best?.issues ?? -1) ? d : best, null)

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-card-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-l from-idf-blueDark to-idf-blue text-white p-5 rounded-t-2xl flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold">📍 {base}</h2>
            <p className="text-blue-200 text-sm mt-0.5">היסטוריית ביקורות לאורך זמן</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none transition-colors">✕</button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-bold">אין נתונים לבסיס זה</div>
        ) : (
          <div className="p-5 space-y-5">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="סה״כ ביקורות" value={totalReports} color="text-idf-blue dark:text-dark-blue" />
              <KPICard label="ליקויים כולל" value={totalIssues} color="text-red-600" />
              <KPICard label="% ליקויים" value={`${overallRate}%`} color={overallRate > 30 ? 'text-red-600' : overallRate > 15 ? 'text-yellow-600' : 'text-green-600'} />
              <KPICard
                label="מגמה"
                value={trend?.label ?? '—'}
                color={trend?.color ?? 'text-gray-500'}
                small
              />
            </div>

            {/* גרף קו — % ליקויים לאורך זמן */}
            <div className="card">
              <h3 className="font-bold text-gray-700 dark:text-dark-text text-sm mb-3">% ליקויים לאורך זמן</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, '% ליקויים']}
                    labelFormatter={(l) => `חודש: ${l}`}
                  />
                  <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'סף אדום', fontSize: 10, fill: '#ef4444' }} />
                  <Line
                    type="monotone"
                    dataKey="issueRate"
                    stroke="#1a3a5c"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1a3a5c' }}
                    activeDot={{ r: 6 }}
                    name="% ליקויים"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* גרף עמודות — מספר ביקורות vs ליקויים */}
            <div className="card">
              <h3 className="font-bold text-gray-700 dark:text-dark-text text-sm mb-3">ביקורות vs ליקויים לפי חודש</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total"  fill="#93c5fd" name="ביקורות"  radius={[3,3,0,0]} />
                  <Bar dataKey="issues" fill="#f87171" name="ליקויים"  radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* פירוט חודשים */}
            <div className="card overflow-x-auto">
              <h3 className="font-bold text-gray-700 dark:text-dark-text text-sm mb-3">פירוט חודשי</h3>
              <table className="w-full text-sm text-right min-w-[360px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-dark-border text-xs text-gray-500">
                    <th className="pb-2 font-semibold">חודש</th>
                    <th className="pb-2 font-semibold text-center">ביקורות</th>
                    <th className="pb-2 font-semibold text-center">ליקויים</th>
                    <th className="pb-2 font-semibold text-center">%</th>
                    <th className="pb-2 font-semibold text-center">מגמה</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => {
                    const prev = data[i - 1]?.issueRate
                    const arrow = prev == null ? null : d.issueRate < prev ? '↓' : d.issueRate > prev ? '↑' : '→'
                    const arrowColor = arrow === '↓' ? 'text-green-600' : arrow === '↑' ? 'text-red-500' : 'text-gray-400'
                    return (
                      <tr key={d.month} className="border-b border-gray-50 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface2 transition-colors">
                        <td className="py-2 font-semibold">{d.label}</td>
                        <td className="py-2 text-center">{d.total}</td>
                        <td className="py-2 text-center text-red-500 font-bold">{d.issues}</td>
                        <td className="py-2 text-center font-bold">
                          <span className={d.issueRate > 30 ? 'text-red-600' : d.issueRate > 15 ? 'text-yellow-600' : 'text-green-600'}>
                            {d.issueRate}%
                          </span>
                        </td>
                        <td className={`py-2 text-center font-bold text-lg ${arrowColor}`}>{arrow ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

function KPICard({ label, value, color, small }) {
  return (
    <div className="card text-center py-3">
      <p className={`${small ? 'text-base' : 'text-2xl'} font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5">{label}</p>
    </div>
  )
}
