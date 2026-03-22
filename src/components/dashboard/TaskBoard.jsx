import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useCreateTask, useTasks, useUpdateTaskStatus } from '../../hooks/useTasks'
import Spinner from '../ui/Spinner'

const EMPTY_FORM = {
  assignee_name: '',
  title: '',
  base: '',
  priority: 'medium',
  due_date: '',
  description: '',
}

const STATUS_META = {
  open: { label: 'פתוחה', className: 'status-warn' },
  in_progress: { label: 'בטיפול', className: 'status-ok' },
  done: { label: 'הושלמה', className: 'status-ok' },
}

const PRIORITY_META = {
  low: { label: 'נמוכה', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'בינונית', className: 'bg-amber-100 text-amber-800' },
  high: { label: 'גבוהה', className: 'bg-rose-100 text-rose-800' },
}

function formatTaskDate(value) {
  if (!value) return 'ללא תאריך יעד'
  try {
    return new Date(value).toLocaleDateString('he-IL')
  } catch {
    return value
  }
}

function getPriorityRank(priority) {
  if (priority === 'high') return 0
  if (priority === 'medium') return 1
  return 2
}

function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    const leftPriority = getPriorityRank(left.priority)
    const rightPriority = getPriorityRank(right.priority)

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    if (left.due_date && right.due_date) {
      return new Date(left.due_date) - new Date(right.due_date)
    }

    if (left.due_date && !right.due_date) return -1
    if (!left.due_date && right.due_date) return 1

    return new Date(right.created_at || 0) - new Date(left.created_at || 0)
  })
}

export default function TaskBoard({
  unit,
  canManageTasks = false,
  title = '🎯 משימות לחיילים',
  subtitle = null,
  presetTasks = null,
  showGroupingTabs = false,
  showQuickFilters = false,
  hideModeBadge = false,
}) {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [showCreate, setShowCreate] = useState(false)
  const [groupingTab, setGroupingTab] = useState(0)
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [baseFilter, setBaseFilter] = useState('')
  const { data: queryTasks = [], isLoading, error, refetch } = useTasks({ unit, enabled: presetTasks == null })
  const createTask = useCreateTask()
  const updateTaskStatus = useUpdateTaskStatus()
  const tasks = presetTasks ?? queryTasks
  const normalizedAssigneeFilter = assigneeFilter.trim().toLowerCase()
  const normalizedBaseFilter = baseFilter.trim().toLowerCase()

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const assigneeMatches = !normalizedAssigneeFilter
        || (task.assignee_name || '').toLowerCase().includes(normalizedAssigneeFilter)
      const baseMatches = !normalizedBaseFilter
        || (task.base || '').toLowerCase().includes(normalizedBaseFilter)

      return assigneeMatches && baseMatches
    })
  }, [tasks, normalizedAssigneeFilter, normalizedBaseFilter])

  const taskGroups = useMemo(() => {
    const open = sortTasks(filteredTasks.filter((task) => task.status !== 'done'))
    const done = sortTasks(filteredTasks.filter((task) => task.status === 'done'))
    return { open, done }
  }, [filteredTasks])

  const summary = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter((task) => task.status === 'open').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  }), [tasks])

  const resolvedSubtitle = subtitle ?? (
    showQuickFilters
      ? `מציג ${filteredTasks.length} משימות מתוך ${tasks.length}`
      : 'ניהול משימות לביצוע במוצבים ובשטח'
  )

  const locationGroups = useMemo(() => {
    const grouped = filteredTasks.reduce((acc, task) => {
      const key = task.base?.trim() || 'ללא מיקום מוגדר'
      if (!acc[key]) acc[key] = []
      acc[key].push(task)
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([base, items]) => ({
        base,
        items: sortTasks(items),
        openCount: items.filter((task) => task.status !== 'done').length,
        doneCount: items.filter((task) => task.status === 'done').length,
      }))
      .sort((left, right) => right.items.length - left.items.length)
  }, [filteredTasks])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateTask(event) {
    event.preventDefault()

    if (!canManageTasks) {
      toast.error('רק לחשבון רב החטמ״ר / רב החטיבה מותר להוסיף משימות')
      return
    }

    if (!form.title.trim() || !form.assignee_name.trim()) {
      toast.error('יש למלא כותרת משימה ושם חייל')
      return
    }

    try {
      await createTask.mutateAsync({
        unit,
        assignee_name: form.assignee_name.trim(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        base: form.base.trim() || null,
        priority: form.priority,
        due_date: form.due_date || null,
        status: 'open',
        created_by_name: user?.displayName || user?.unit || 'מערכת',
        created_by_unit: user?.unit || unit,
        created_by_role: user?.role || null,
      })

      toast.success('המשימה נוספה בהצלחה')
      setForm(EMPTY_FORM)
      setShowCreate(false)
    } catch (error) {
      toast.error(error.message || 'שגיאה בהוספת משימה')
    }
  }

  async function handleStatusChange(task, status) {
    try {
      await updateTaskStatus.mutateAsync({
        id: task.id,
        status,
        actorName: user?.displayName || user?.unit || 'מערכת',
      })
      toast.success('סטטוס המשימה עודכן')
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון סטטוס')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="section-title mb-2">{title}</div>
          <p className="text-sm text-gray-500">{resolvedSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!hideModeBadge && (!showGroupingTabs || canManageTasks) && (
            <span className={`text-xs font-bold rounded-full px-3 py-1 ${canManageTasks ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {canManageTasks ? 'יכול לנהל' : 'קריאה בלבד'}
            </span>
          )}
          {canManageTasks && (
            <button
              onClick={() => setShowCreate((current) => !current)}
              className="btn-primary"
              type="button"
            >
              {showCreate ? 'סגור טופס' : '➕ הוסף משימה'}
            </button>
          )}
        </div>
      </div>

      {showQuickFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="input-field"
            placeholder="חיפוש לפי חייל"
          />
          <input
            value={baseFilter}
            onChange={(event) => setBaseFilter(event.target.value)}
            className="input-field"
            placeholder="חיפוש לפי מוצב"
          />
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-idf-blue">{summary.total}</p>
          <p className="text-xs text-gray-500 mt-1">סה״כ משימות</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-amber-600">{summary.open}</p>
          <p className="text-xs text-gray-500 mt-1">פתוחות</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-emerald-600">{summary.inProgress}</p>
          <p className="text-xs text-gray-500 mt-1">בטיפול</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-slate-600">{summary.done}</p>
          <p className="text-xs text-gray-500 mt-1">הושלמו</p>
        </div>
      </div>

      {showCreate && canManageTasks && (
        <form onSubmit={handleCreateTask} className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className="label">שם החייל</label>
              <input
                value={form.assignee_name}
                onChange={(event) => updateField('assignee_name', event.target.value)}
                className="input-field"
                placeholder="ישראל ישראלי"
              />
            </div>
            <div>
              <label className="label">כותרת המשימה</label>
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="input-field"
                placeholder="בדיקת מזוזות במגורים"
              />
            </div>
            <div>
              <label className="label">מוצב / מיקום</label>
              <input
                value={form.base}
                onChange={(event) => updateField('base', event.target.value)}
                className="input-field"
                placeholder="מוצב גלבוע"
              />
            </div>
            <div>
              <label className="label">עד מתי</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(event) => updateField('due_date', event.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-3">
            <div>
              <label className="label">דחיפות</label>
              <select
                value={form.priority}
                onChange={(event) => updateField('priority', event.target.value)}
                className="select-field"
              >
                <option value="low">נמוכה</option>
                <option value="medium">בינונית</option>
                <option value="high">גבוהה</option>
              </select>
            </div>
            <div>
              <label className="label">פירוט</label>
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="input-field min-h-[110px]"
                placeholder="פרטי משימה, דגשים, ציוד נדרש או שעת ביצוע..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createTask.isPending}
              className="btn-primary"
            >
              {createTask.isPending ? 'שומר...' : 'שמור משימה'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="card border-2 border-red-200 bg-red-50 text-right">
          <h3 className="font-bold text-red-800">שגיאה בטעינת המשימות</h3>
          <p className="text-sm text-red-700 mt-2">{error.message || 'אירעה שגיאה לא צפויה'}</p>
          <button type="button" onClick={() => refetch()} className="btn-danger mt-4">נסה שוב</button>
        </div>
      ) : (
        <div className="space-y-5">
          {showGroupingTabs && (
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-dark-surface2 rounded-2xl">
              {[
                { label: 'חלוקה לפי דחיפות', icon: '⚡' },
                { label: 'חלוקה לפי מיקום', icon: '📍' },
              ].map((tab, index) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setGroupingTab(index)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    groupingTab === index
                      ? 'bg-white dark:bg-dark-surface text-idf-blue dark:text-dark-blue shadow-sm'
                      : 'text-gray-500 dark:text-dark-muted'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="mr-2">{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {(!showGroupingTabs || groupingTab === 0) && (
            <div className="space-y-5">
              <TaskSection
                title="משימות פתוחות"
                emptyText="אין כרגע משימות פתוחות ביחידה"
                tasks={taskGroups.open}
                canManageTasks={canManageTasks}
                onStatusChange={handleStatusChange}
                isUpdating={updateTaskStatus.isPending}
              />

              <TaskSection
                title="משימות שהושלמו"
                emptyText="עדיין אין משימות שהושלמו"
                tasks={taskGroups.done.slice(0, 8)}
                canManageTasks={canManageTasks}
                onStatusChange={handleStatusChange}
                isUpdating={updateTaskStatus.isPending}
              />
            </div>
          )}

          {showGroupingTabs && groupingTab === 1 && (
            <TaskLocationGroups
              groups={locationGroups}
              canManageTasks={canManageTasks}
              onStatusChange={handleStatusChange}
              isUpdating={updateTaskStatus.isPending}
            />
          )}
        </div>
      )}
    </div>
  )
}

function TaskLocationGroups({ groups, canManageTasks, onStatusChange, isUpdating }) {
  if (groups.length === 0) {
    return <div className="card text-center py-8 text-gray-400 font-semibold">אין כרגע משימות פתוחות ביחידה</div>
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.base} className="card space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{group.base}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {group.items.length} משימות · {group.openCount} פתוחות · {group.doneCount} הושלמו
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="status-ok">{group.doneCount} הושלמו</span>
              <span className="status-warn">{group.openCount} פתוחות</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {group.items.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                canManageTasks={canManageTasks}
                onStatusChange={onStatusChange}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TaskSection({ title, tasks, emptyText, canManageTasks, onStatusChange, isUpdating }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">{title}</h3>
        <span className="text-xs text-gray-500 font-semibold">{tasks.length} פריטים</span>
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center py-8 text-gray-400 font-semibold">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canManageTasks={canManageTasks}
              onStatusChange={onStatusChange}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, canManageTasks, onStatusChange, isUpdating }) {
  const statusMeta = STATUS_META[task.status] || STATUS_META.open
  const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const isOverdue = task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date()

  return (
    <div className={`card space-y-3 ${isOverdue ? 'border-2 border-red-200 bg-red-50/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-800 text-lg">{task.title}</p>
          <p className="text-sm text-gray-500 mt-1">
            👤 {task.assignee_name || 'ללא שיוך'}{task.base ? ` · 📍 ${task.base}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={statusMeta.className}>{statusMeta.label}</span>
          <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${priorityMeta.className}`}>
            {priorityMeta.label}
          </span>
          {isOverdue && <span className="text-xs font-bold text-red-700">באיחור</span>}
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{task.description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
        <p>🗓️ יעד: {formatTaskDate(task.due_date)}</p>
        <p>✍️ נוצרה על ידי: {task.created_by_name || task.created_by_unit || 'מערכת'}</p>
        <p>🕒 נוצרה: {formatTaskDate(task.created_at)}</p>
        {task.completed_by && <p>✅ הושלמה על ידי: {task.completed_by}</p>}
      </div>

      {canManageTasks && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500">עדכון סטטוס</span>
          <select
            value={task.status || 'open'}
            disabled={isUpdating}
            onChange={(event) => onStatusChange(task, event.target.value)}
            className="select-field max-w-[180px]"
          >
            <option value="open">פתוחה</option>
            <option value="in_progress">בטיפול</option>
            <option value="done">הושלמה</option>
          </select>
        </div>
      )}
    </div>
  )
}
