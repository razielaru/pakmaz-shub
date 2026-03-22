// src/pages/NewReport.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useInsertReport } from '../hooks/useReports'
import { useGPS } from '../hooks/useGPS'
import { useBaseRegistry } from '../hooks/useBaseRegistry'
import { supabase } from '../supabaseClient'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import Tab1_Kashrut from '../components/report/Tab1_Kashrut'
import Tab2_Lounge from '../components/report/Tab2_Lounge'
import Tab3_Synagogue from '../components/report/Tab3_Synagogue'
import Tab4_Spirit from '../components/report/Tab4_Spirit'
import Tab5_Signature from '../components/report/Tab5_Signature'
import Tab6_Deficits from '../components/report/Tab6_Deficits'
import GPSCheckpoint from '../components/report/GPSCheckpoint'
import { buildGpsAssessment } from '../utils/gpsAssessment'
import { calculateReliabilityScore } from '../utils/reliabilityScore'
import { applyWatermark } from '../utils/photoWatermark'
import { getGpsStatusKey, getGpsStatusMeta } from '../utils/reportStatus'

const TABS = [
  { icon: '🥩', label: 'כשרות' },
  { icon: '☕', label: 'טרקלין/ויקוק' },
  { icon: '🕍', label: 'ביה"כ ועירוב' },
  { icon: '📜', label: 'נהלים ורוח' },
  { icon: '✍️', label: 'שיחת חתך - אינו חובה' },
  { icon: '⚠️', label: 'סיכום' },
]

const DRAFT_VERSION = 2
const COMBAT_BRIGADES = ['חטיבה 35', 'חטיבה 89', 'חטיבה 900']

const KASHRUT_REQUIRED_FIELDS = [
  ['k_cook_type', 'סוג מטבח'],
  ['k_cert', 'תעודת כשרות מתוקפת'],
  ['k_bishul', 'בישול ישראל'],
  ['k_issues', 'יש תקלות כשרות'],
  ['k_shabbat_supervisor', 'יש נאמן כשרות בשבת'],
  ['k_separation', 'הפרדה'],
  ['k_briefing', 'תדריך טבחים'],
  ['k_products', 'רכש חוץ לפי פקודה'],
  ['k_dates', 'דף תאריכים לתבלינים'],
  ['k_leafs', 'שטיפת ירק'],
  ['k_holes', 'חירור גסטרונומים'],
  ['k_eggs', 'בדיקת ביצים'],
  ['k_heater', 'חימום נפרד בין בשר ודגים'],
  ['k_app', 'מולאה אפליקציה'],
]

const KASHRUT_NON_COMBAT_EXTRA_FIELDS = [
  ['k_machshir', 'חדר מכ״ש במפג״ד'],
]

const LOUNGE_REQUIRED_FIELDS = [
  ['t_private', 'כלים פרטיים בטרקלין'],
  ['t_kitchen_tools', 'כלי מטבח בטרקלין'],
  ['t_procedure', 'נוהל סגירה בטרקלין'],
  ['t_friday', 'כלים חשמליים סגורים בשבת'],
  ['t_app', 'אפליקציית טרקלין'],
  ['w_location', 'מיקום הוויקוק'],
  ['w_private', 'כלים פרטיים בוויקוק'],
  ['w_kitchen_tools', 'כלי מטבח בוויקוק'],
  ['w_procedure', 'עבודה לפי פקודה בוויקוק'],
  ['w_guidelines', 'הנחיות לוויקוק'],
  ['p_pakal', 'פק״ל רבנות'],
  ['p_marked', 'הכלים מסומנים'],
  ['p_mix', 'ערבוב כלים'],
  ['p_kasher', 'נדרשת הכשרת כלים'],
]

const SYNAGOGUE_REQUIRED_FIELDS = [
  ['s_torah_id', 'מספר ספר תורה'],
  ['s_torah_nusach', 'נוסח ספר התורה'],
  ['hq_shul_sefer_torah', 'ס״ת, תפילין, טליתות, כיפות, נרות מסודרים'],
  ['s_board', 'לוח רבנות מעודכן'],
  ['s_clean', 'בית הכנסת נקי'],
  ['s_havdala', 'ערכת הבדלה והדלקת נרות שבת'],
  ['s_gemach', 'גמ״ח טלית ותפילין'],
  ['s_smartbis', 'תקלת בינוי / סמארט-ביס'],
  ['s_geniza', 'פח גניזה'],
  ['hq_shul_clean', 'בית הכנסת מטופל ונקי'],
  ['hq_shul_equip_missing', 'ציוד חסר בבית הכנסת'],
  ['hq_holiday_equipment', 'מענה בחגים'],
  ['hq_holiday_equip_recv', 'ציוד מותאם לחגים'],
  ['hq_religion_equip_req', 'בקשת ציוד דת'],
  ['hq_mezuzot_gap', 'פער במזוזות ביחידה'],
  ['r_mezuzot_missing', 'כמות מזוזות חסרות'],
  ['e_status', 'סטטוס עירוב'],
  ['e_check', 'בוצעה בדיקה פיזית'],
  ['e_doc', 'בוצע תיעוד'],
  ['e_photo', 'קיימת תצ״א'],
  ['hq_eruv_problem', 'בעיה בעירוב קיבלה מענה'],
]

const SYNAGOGUE_COMBAT_EXTRA_FIELDS = [
  ['hq_board_info', 'לוח רבנות מורחב'],
  ['hq_tefillin_stand', 'עמדת טלית ותפילין'],
  ['hq_eruv_door_shape', 'צורת הפתח לעירוב'],
  ['hq_eruv_fence_work', 'עבודת גדר שפוגעת בעירוב'],
  ['hq_shabbat_device_board', 'שילוט על התקני שבת'],
]

const SPIRIT_REQUIRED_FIELDS = [
  ['r_sg', 'הוראות רבנות בש.ג'],
  ['r_hamal', 'הוראות רבנות בחמ״ל'],
  ['r_sign', 'שילוט שבת'],
  ['r_netilot', 'נטלות'],
]

const SPIRIT_COMBAT_REQUIRED_FIELDS = [
  ['command', 'פיקוד'],
  ['activity_date', 'תאריך הפעילות'],
  ['lesson_name', 'שם השיעור'],
  ['is_rabbi_instructor', 'האם המעביר הוא רב היחידה'],
  ['instructor_name', 'שם המעביר'],
  ['participants_count', 'כמות משתתפים'],
  ['participants_type', 'סוג משתתפים'],
]

const SPIRIT_NON_COMBAT_REQUIRED_FIELDS = [
  ['soldier_yeshiva', 'יש ימי ישיבה'],
  ['soldier_has_lesson', 'יש שיעור תורה במוצב'],
  ['soldier_want_lesson', 'יש רצון לשיעור תורה'],
]

function isAnswered(value) {
  if (value == null) return false
  if (typeof value === 'number') return true
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function isExplainWithoutReason(value) {
  return typeof value === 'string'
    && value.startsWith('לא יודע')
    && !/\((.*?)\)/.test(value.replace(/\(\s*\)/, ''))
}

function hasMeaningfulValue(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function getMissingFields(formData, requiredFields) {
  return requiredFields
    .filter(([field]) => !isAnswered(formData[field]))
    .map(([, label]) => label)
}

function hasLoungeContent(formData) {
  return LOUNGE_REQUIRED_FIELDS.some(([field]) => hasMeaningfulValue(formData[field]))
}

function getDraftStorageKey(user) {
  return `pakmaz:new-report-draft:${user?.unit || 'guest'}`
}

function sanitizeDraftData(formData) {
  return Object.fromEntries(
    Object.entries(formData).filter(([, value]) => {
      if (value == null) return true
      if (typeof File !== 'undefined' && value instanceof File) return false
      if (typeof Blob !== 'undefined' && value instanceof Blob) return false
      return true
    })
  )
}

function hasDraftContent(formData) {
  return Object.entries(formData).some(([key, value]) => {
    if (['date', 'unit'].includes(key)) return false
    if (typeof value === 'string') return value.trim() !== ''
    return value != null
  })
}

function getDeviceDetails() {
  const platform = navigator.userAgentData?.platform || navigator.platform || 'לא ידוע'
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'נייד' : 'מחשב'
  const vendor = navigator.vendor || 'דפדפן'

  return {
    label: `${mobile} · ${platform} · ${vendor}`,
    platform,
    userAgent: navigator.userAgent,
  }
}

export default function NewReport() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const insertReport = useInsertReport()
  const gps = useGPS('new_report_main')
  const { baseNames, coordinates } = useBaseRegistry(user?.unit)

  const [activeTab, setActiveTab] = useState(0)
  const [startTime] = useState(Date.now())
  const [tabStartTimes, setTabStartTimes] = useState({})
  const [speedFlags, setSpeedFlags] = useState([])
  const [mandatoryWarnings, setMandatoryWarnings] = useState([])
  const [baseReferenceCoords, setBaseReferenceCoords] = useState(null)
  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const [draftLoaded, setDraftLoaded] = useState(false)

  const [formData, setFormData] = useState({
    unit: user?.unit || '',
    inspector: user?.displayName || '',
    base: '',
    date: new Date().toISOString().split('T')[0],
    report_time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    gps_verification_note: '',
  })

  const gpsAssessment = buildGpsAssessment({
    lat: gps.lat,
    lon: gps.lon,
    base: formData.base,
    accuracy: gps.accuracy,
    referenceCoords: baseReferenceCoords,
  })
  const gpsStatusKey = getGpsStatusKey(null, gpsAssessment)
  const gpsStatusMeta = getGpsStatusMeta(gpsStatusKey)

  const draftKey = useMemo(() => getDraftStorageKey(user), [user])

  useEffect(() => {
    const syncClock = () => {
      setFormData((prev) => ({
        ...prev,
        report_time: new Date().toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
    }

    syncClock()
    const interval = window.setInterval(syncClock, 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    setTabStartTimes((prev) => ({ ...prev, [activeTab]: Date.now() }))
  }, [activeTab])

  useEffect(() => {
    if (!user || draftLoaded) return

    const rawDraft = localStorage.getItem(draftKey)
    if (!rawDraft) {
      setDraftLoaded(true)
      return
    }

    try {
      const parsed = JSON.parse(rawDraft)
      if (parsed.version !== DRAFT_VERSION || !parsed.formData) {
        localStorage.removeItem(draftKey)
        setDraftLoaded(true)
        return
      }

      setFormData((prev) => ({ ...prev, ...parsed.formData }))
      setBaseReferenceCoords(parsed.baseReferenceCoords || null)
      setActiveTab(parsed.activeTab || 0)
      setDraftSavedAt(parsed.savedAt || null)
      toast.success('טיוטת דיווח קודמת שוחזרה אוטומטית')
    } catch {
      localStorage.removeItem(draftKey)
    } finally {
      setDraftLoaded(true)
    }
  }, [draftKey, draftLoaded, user])

  useEffect(() => {
    if (!draftLoaded) return

    const interval = window.setInterval(() => {
      if (!hasDraftContent(formData)) return

      const payload = {
        version: DRAFT_VERSION,
        formData: sanitizeDraftData(formData),
        activeTab,
        baseReferenceCoords,
        savedAt: new Date().toISOString(),
      }

      localStorage.setItem(draftKey, JSON.stringify(payload))
      setDraftSavedAt(payload.savedAt)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [activeTab, baseReferenceCoords, draftKey, draftLoaded, formData])

  async function uploadPhoto(file, pathSuffix) {
    if (!file) return null

    try {
      const stamped = await applyWatermark(file, {
        base: formData.base || '—',
        inspector: formData.inspector || '—',
        lat: gps.lat,
        lon: gps.lon,
      })

      const safeName = `report_${Date.now()}_${pathSuffix}.jpg`
      const { error } = await supabase.storage.from('report-photos').upload(safeName, stamped)
      if (error) {
        toast.error('שגיאה בהעלאת תמונה')
        return null
      }
      const { data } = supabase.storage.from('report-photos').getPublicUrl(safeName)
      return data.publicUrl
    } catch (error) {
      console.warn('Watermark failed, uploading original', error)
      const safeName = `report_${Date.now()}_${pathSuffix}.jpg`
      const { error: uploadError } = await supabase.storage.from('report-photos').upload(safeName, file)
      if (uploadError) {
        toast.error('שגיאה בהעלאת תמונה')
        return null
      }
      const { data } = supabase.storage.from('report-photos').getPublicUrl(safeName)
      return data.publicUrl
    }
  }

  function validateForm() {
    const warnings = []
    const nextSpeedFlags = []
    const now = Date.now()
    const isCombatBrigade = COMBAT_BRIGADES.includes(user?.unit)
    const loungeMode = !isCombatBrigade && hasLoungeContent(formData)

    if (!formData.base) warnings.push('חובה להזין שם מוצב')
    if (!formData.inspector?.trim()) warnings.push('חובה להזין שם ממלא')
    if (!gps.hasFix) warnings.push('חובה לאשר מיקום GPS לפני השליחה')

    const requiredGroups = loungeMode
      ? [
          {
            tabIndex: 1,
            label: 'טרקלין/ויקוק',
            minMs: 15000,
            fields: LOUNGE_REQUIRED_FIELDS,
          },
        ]
      : [
          {
            tabIndex: 0,
            label: 'כשרות',
            minMs: 30000,
            fields: isCombatBrigade
              ? KASHRUT_REQUIRED_FIELDS
              : [...KASHRUT_REQUIRED_FIELDS, ...KASHRUT_NON_COMBAT_EXTRA_FIELDS],
          },
          {
            tabIndex: 2,
            label: 'ביה"כ ועירוב',
            minMs: 30000,
            fields: isCombatBrigade
              ? [...SYNAGOGUE_REQUIRED_FIELDS, ...SYNAGOGUE_COMBAT_EXTRA_FIELDS]
              : SYNAGOGUE_REQUIRED_FIELDS,
          },
          {
            tabIndex: 3,
            label: 'נהלים ורוח',
            minMs: 15000,
            fields: isCombatBrigade
              ? [...SPIRIT_REQUIRED_FIELDS, ...SPIRIT_COMBAT_REQUIRED_FIELDS]
              : [...SPIRIT_REQUIRED_FIELDS, ...SPIRIT_NON_COMBAT_REQUIRED_FIELDS],
          },
        ]

    requiredGroups.forEach((group) => {
      const missingFields = getMissingFields(formData, group.fields)
      if (missingFields.length > 0) {
        warnings.push(`בטאב ${group.label} חסרים: ${missingFields.join(', ')}`)
      }

      const duration = now - (tabStartTimes[group.tabIndex] || now)
      if (duration <= 0 || duration < group.minMs) {
        nextSpeedFlags.push(`נראה שעברת על טאב ${group.label} מהר מדי, אתה בטוח שמילאת כמו שצריך? אם לא שים לב: תשובות נכונות יתנו מענה טוב לחיילים בקצה, אשריך!`)
      }
    })

    if (formData.k_issues === 'כן' && !formData.k_issues_description?.trim()) {
      warnings.push('בטאב כשרות חובה לפרט את תקלות הכשרות שנמצאו')
    }

    if (formData.k_shabbat_supervisor === 'כן') {
      if (!formData.k_shabbat_supervisor_name?.trim()) warnings.push('בטאב כשרות חובה להזין שם נאמן כשרות')
      if (!formData.k_shabbat_supervisor_phone?.trim()) warnings.push('בטאב כשרות חובה להזין טלפון נאמן כשרות')
    }

    if (!isCombatBrigade) {
      if (formData.soldier_has_lesson === 'כן') {
        if (!formData.soldier_lesson_teacher?.trim()) warnings.push('בטאב נהלים ורוח חובה להזין שם מעביר שיעור')
        if (!formData.soldier_lesson_phone?.trim()) warnings.push('בטאב נהלים ורוח חובה להזין טלפון מעביר שיעור')
      }

      if (formData.soldier_want_lesson === 'כן') {
        if (!formData.soldier_want_lesson_qty?.toString().trim()) warnings.push('בטאב נהלים ורוח חובה להזין כמה אנשים רוצים שיעור')
        if (!formData.soldier_want_lesson_phone?.trim()) warnings.push('בטאב נהלים ורוח חובה להזין טלפון איש קשר לשיעור')
      }
    }

    Object.entries(formData).forEach(([key, value]) => {
      if (isExplainWithoutReason(value)) {
        warnings.push(`חסר הסבר מילולי עבור "${key}" שסומן כ"לא נבדק"`)
      }
    })

    setMandatoryWarnings(warnings)
    setSpeedFlags(nextSpeedFlags)
    return warnings.length === 0 && nextSpeedFlags.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('לא ניתן לשלוח. אנא תקן את הליקויים האדומים בטופס.')
      return
    }

    try {
      const finalData = { ...formData }

      if (finalData.k_issues_photo) finalData.k_issues_photo_url = await uploadPhoto(finalData.k_issues_photo, 'issue')
      if (finalData.k_shabbat_photo) finalData.k_shabbat_photo_url = await uploadPhoto(finalData.k_shabbat_photo, 'shabbat')
      if (finalData.evidence_photo) finalData.evidence_photo_url = await uploadPhoto(finalData.evidence_photo, 'evidence')

      if (finalData.gps_verification_note?.trim()) {
        const gpsNote = `הערת GPS: ${finalData.gps_verification_note.trim()}`
        finalData.free_text = finalData.free_text?.trim()
          ? `${gpsNote}\n\n${finalData.free_text.trim()}`
          : gpsNote
      }

      delete finalData.k_issues_photo
      delete finalData.k_shabbat_photo
      delete finalData.evidence_photo
      delete finalData.gps_verification_note
      delete finalData.report_time

      const device = getDeviceDetails()

      finalData.inspector = finalData.inspector?.trim()
      finalData.gps_lat = gps.lat
      finalData.gps_lon = gps.lon
      finalData.latitude = gps.lat
      finalData.longitude = gps.lon
      finalData.gps_accuracy_meters = gps.accuracy || null
      finalData.gps_reference_source = gpsAssessment?.referenceSource || 'catalog'
      finalData.gps_status = gpsStatusKey
      finalData.device_label = device.label
      finalData.device_platform = device.platform
      finalData.device_user_agent = device.userAgent
      finalData._elapsed_seconds = Math.floor((Date.now() - startTime) / 1000)

      const { score } = calculateReliabilityScore(finalData, {
        accuracy: gps.accuracy,
        referenceCoords: baseReferenceCoords,
      })

      finalData.reliability_score = score
      if (finalData._gps_distance_km != null) {
        finalData.gps_distance_km = parseFloat(finalData._gps_distance_km.toFixed(3))
      }
      if (finalData._gps_suspicious) {
        finalData.gps_suspicious = true
      }

      if (
        finalData.gps_lat != null &&
        finalData.gps_lon != null &&
        finalData.gps_status !== 'matched'
      ) {
        const gpsManagerAlert = `התראת GPS למנהל: הדוח נשלח עם חריגת מיקום. מרחק מהמוצב: ${finalData.gps_distance_km ?? 'לא זמין'} ק"מ | מיקום מדויק: ${Number(finalData.gps_lat).toFixed(6)}, ${Number(finalData.gps_lon).toFixed(6)}`
        finalData.free_text = finalData.free_text?.trim()
          ? `${gpsManagerAlert}\n\n${finalData.free_text.trim()}`
          : gpsManagerAlert
      }

      finalData.review_status = finalData.gps_status === 'matched' && score >= 60 ? 'ok' : 'suspicious'
      delete finalData._gps_distance_km
      delete finalData._gps_suspicious

      await insertReport.mutateAsync({
        reportData: finalData,
        auditEntry: {
          action: 'created',
          actor_name: finalData.inspector,
          actor_unit: finalData.unit,
          device_label: device.label,
          device_platform: device.platform,
          gps_accuracy_meters: gps.accuracy || null,
          gps_status: finalData.gps_status,
        },
      })

      localStorage.removeItem(draftKey)
      toast.success('✅ הדוח נשלח בהצלחה לחמ״ל!')
      navigate('/')
    } catch (error) {
      toast.error('שגיאה בשמירת הדוח: ' + error.message)
    }
  }

  return (
    <PageLayout title="📋 דיווח ביקורת שטח" subtitle={user?.unit}>
      <div className="max-w-4xl mx-auto bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-idf-border dark:border-dark-border overflow-hidden pb-6 mb-20">
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-dark-surface2 border-b border-gray-200 dark:border-dark-border">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">שם ממלא הדוח *</label>
              <input
                type="text"
                className="input-field font-semibold text-sm sm:text-base"
                placeholder="שם החייל/הרב שמילא בפועל"
                value={formData.inspector}
                onChange={(e) => setFormData((prev) => ({ ...prev, inspector: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">בחר מוצב או מיקום *</label>
              <input
                type="text"
                list="bases-list"
                className="input-field font-bold text-sm sm:text-base"
                placeholder="בחר מהרשימה או הקלד..."
                value={formData.base}
                onChange={(e) => {
                  const nextBase = e.target.value
                  setFormData((prev) => ({ ...prev, base: nextBase }))
                  setBaseReferenceCoords(coordinates[nextBase] || null)
                }}
                required
              />
              <datalist id="bases-list">
                {baseNames.map((base) => (
                  <option key={base} value={base} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="label">תאריך ביקורת</label>
              <input
                type="date"
                className="input-field"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">שעת הדוח</label>
              <input
                type="text"
                className="input-field font-semibold"
                value={formData.report_time || ''}
                readOnly
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
            <span className={`${gpsStatusMeta.className} px-3 py-1`}>סטטוס GPS: {gpsStatusMeta.label}</span>
            {draftSavedAt && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                💾 טיוטה נשמרה: {new Date(draftSavedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              📱 שמירה אוטומטית כל 5 שניות
            </span>
          </div>

          <GPSCheckpoint
            checkpointNum="ראשי"
            base={formData.base}
            referenceCoords={baseReferenceCoords}
            onCapture={() => {}}
            onBaseDetected={(payload) => {
              setFormData((prev) => ({ ...prev, base: payload?.name || '' }))
              if (Number.isFinite(payload?.lat) && Number.isFinite(payload?.lon)) {
                setBaseReferenceCoords([payload.lat, payload.lon])
              } else {
                setBaseReferenceCoords(coordinates[payload?.name] || null)
              }
            }}
          />
        </div>

        {formData.base && (
          <>
            <TabsBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            <div className="p-4 sm:p-6 bg-white dark:bg-dark-surface min-h-[400px]">
              {gpsAssessment && (gpsAssessment.level !== 'ok' || gpsAssessment.lowAccuracy) && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="font-bold text-amber-900 mb-1">בדיקת מיקום דורשת תשומת לב</h4>
                  <p className="text-sm text-amber-800">
                    הדוח עדיין ניתן לשליחה. אם מדובר בגליץ' GPS או בקואורדינטות מוצב לא מדויקות, אפשר לרשום הערה קצרה והמערכת תסמן את הדוח לבדיקה במקום לחסום אותו.
                  </p>
                  <textarea
                    className="input-field mt-3 min-h-[92px] text-sm"
                    placeholder="לדוגמה: הייתי פיזית במוצב, זוהה פער GPS / בוצעה סריקת QR / המיקום באתר ישן"
                    value={formData.gps_verification_note || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gps_verification_note: e.target.value }))}
                  />
                </div>
              )}

              {(mandatoryWarnings.length > 0 || speedFlags.length > 0) && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                  <h4 className="font-bold text-red-800 mb-2">🚨 חובה לתקן לפני שליחה:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {mandatoryWarnings.map((warning, index) => <li key={`w-${index}`}>{warning}</li>)}
                    {speedFlags.map((warning, index) => <li key={`s-${index}`}>{warning}</li>)}
                  </ul>
                </div>
              )}

              {activeTab === 0 && <Tab1_Kashrut data={formData} onChange={setFormData} />}
              {activeTab === 1 && <Tab2_Lounge data={formData} onChange={setFormData} />}
              {activeTab === 2 && <Tab3_Synagogue data={formData} onChange={setFormData} />}
              {activeTab === 3 && <Tab4_Spirit data={formData} onChange={setFormData} />}
              {activeTab === 4 && <Tab5_Signature data={formData} onChange={setFormData} />}
              {activeTab === 5 && (
                <div className="space-y-6">
                  <Tab6_Deficits data={{ ...formData, gps_status: gpsStatusMeta.label }} onChange={setFormData} />

                  <div className="bg-white p-5 rounded-xl border shadow-sm mt-4 text-center">
                    <h3 className="font-bold text-gray-800 mb-2">🚀 מוכן לשליחה?</h3>
                    <button
                      onClick={handleSubmit}
                      disabled={insertReport.isPending}
                      className="btn-primary w-full md:w-auto px-12 py-4 text-xl shadow-lg"
                    >
                      {insertReport.isPending ? 'משגר דיווח לחמ"ל...' : 'שגר דיווח למערכת!'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface sticky bottom-0">
              <button
                onClick={() => setActiveTab((tab) => Math.max(0, tab - 1))}
                disabled={activeTab === 0}
                className="btn-outline text-sm py-3 px-5 disabled:opacity-30"
              >
                הקודם
              </button>
              <span className="text-xs font-bold text-gray-400">{activeTab + 1} / {TABS.length}</span>
              <button
                onClick={() => setActiveTab((tab) => Math.min(TABS.length - 1, tab + 1))}
                disabled={activeTab === TABS.length - 1}
                className="bg-idf-blue text-white hover:bg-idf-blueDark text-sm py-3 px-5 rounded-lg font-bold disabled:opacity-30"
              >
                הבא
              </button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}
