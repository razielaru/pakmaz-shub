import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTasks } from '../hooks/useTasks'
import PageLayout from '../components/layout/PageLayout'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import QueryNotice from '../components/ui/QueryNotice'
import TaskBoard from '../components/dashboard/TaskBoard'
import toast from 'react-hot-toast'

function escapeCSV(v) {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

function exportTasksCSV(tasks) {
  const cols = [
    ['unit', 'יחידה'],
    ['assignee_name', 'חייל'],
    ['title', 'משימה'],
    ['base', 'מוצב'],
    ['priority', 'דחיפות'],
    ['status', 'סטטוס'],
    ['due_date', 'תאריך יעד'],
    ['created_by_name', 'נוצרה על ידי'],
    ['completed_by', 'הושלמה על ידי'],
    ['description', 'פירוט'],
  ]
  const header = cols.map(([, label]) => label).join(',')
  const rows = tasks.map((task) => cols.map(([key]) => escapeCSV(task[key])).join(','))
  const content = '\uFEFF' + [header, ...rows].join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `משימות_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function TasksPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [baseFilter, setBaseFilter] = useState('')
  const { data: tasks = [], isLoading, error, refetch } = useTasks()

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter && task.status !== statusFilter) return false
      if (priorityFilter && task.priority !== priorityFilter) return false
      if (assigneeFilter && !task.assignee_name?.toLowerCase().includes(assigneeFilter.toLowerCase())) return false
      if (baseFilter && !task.base?.toLowerCase().includes(baseFilter.toLowerCase())) return false
      return true
    })
  }, [assigneeFilter, baseFilter, priorityFilter, statusFilter, tasks])

  const overdueTasks = useMemo(() => filtered.filter((task) => (
    task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date()
  )), [filtered])

  useEffect(() => {
    if (overdueTasks.length > 0) {
      toast((t) => (
        <div className="text-right">
          <p className="font-bold">יש משימות באיחור</p>
          <p className="text-sm">{overdueTasks.length} משימות עברו את תאריך היעד</p>
          <button className="mt-2 text-sm font-bold text-red-700" onClick={() => toast.dismiss(t.id)}>סגור</button>
        </div>
      ), { id: 'overdue-tasks', duration: 5000 })
    }
  }, [overdueTasks.length])

  return (
    <PageLayout
      title="🎯 משימות יחידתיות"
      subtitle="ניהול, בקרה ויצוא של משימות לחיילים"
      actions={(
        <div className="flex items-center gap-2 flex-wrap">
          <Badge type={user?.canManageTasks ? 'success' : 'info'}>
            {user?.canManageTasks ? 'הרשאת ניהול מלאה' : 'קריאה בלבד'}
          </Badge>
          <button
            type="button"
            onClick={() => exportTasksCSV(filtered)}
            className="btn-outline text-sm"
            disabled={filtered.length === 0}
          >
            📄 יצוא CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-outline text-sm"
          >
            🖨️ הדפס / PDF
          </button>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="input-field" placeholder="חיפוש לפי חייל" />
          <input value={baseFilter} onChange={(e) => setBaseFilter(e.target.value)} className="input-field" placeholder="חיפוש לפי מוצב" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-field">
            <option value="">כל הסטטוסים</option>
            <option value="open">פתוחה</option>
            <option value="in_progress">בטיפול</option>
            <option value="done">הושלמה</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="select-field">
            <option value="">כל הדחיפויות</option>
            <option value="high">גבוהה</option>
            <option value="medium">בינונית</option>
            <option value="low">נמוכה</option>
          </select>
        </div>

        {overdueTasks.length > 0 && (
          <div className="card border-2 border-red-200 bg-red-50">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-red-800">⏰ משימות באיחור</h3>
                <p className="text-sm text-red-700 mt-1">{overdueTasks.length} משימות עברו את תאריך היעד ודורשות טיפול</p>
              </div>
              <Badge type="error" size="md">{overdueTasks.length} באיחור</Badge>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        ) : error ? (
          <QueryNotice
            title="לא הצלחנו לטעון את המשימות"
            message={error.message || 'אירעה שגיאת הרשאה או חיבור ל-Supabase'}
            action={<button type="button" onClick={() => refetch()} className="btn-danger">נסה שוב</button>}
          />
        ) : filtered.length === 0 && tasks.length === 0 && !user?.canManageTasks ? (
          <EmptyState
            icon="🗂️"
            title="עדיין אין משימות ביחידה"
            description="כאשר יוקצו משימות ליחידה, הן יופיעו כאן."
          />
        ) : filtered.length === 0 && tasks.length > 0 ? (
          <EmptyState
            icon="🔎"
            title="לא נמצאו משימות לפי הסינון"
            description="נסה לנקות חלק מהפילטרים או לחפש חייל / מוצב אחר."
          />
        ) : (
          <TaskBoard
            unit={user?.unit}
            canManageTasks={Boolean(user?.canManageTasks)}
            title="🎯 לוח משימות מלא"
            subtitle={`מציג ${filtered.length} משימות מתוך ${tasks.length}`}
            presetTasks={filtered}
          />
        )}
      </div>
    </PageLayout>
  )
}
