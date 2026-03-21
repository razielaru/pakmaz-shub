// src/hooks/usePushAlerts.js
// Supabase Realtime — מאזין לדוחות חדשים ומציג התראה מיידית
// + Web Push API לשליחת נוטיפיקיישן ל-OS (אם הרשאה ניתנה)
import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'

// ─── פונקציית עזר: שליחת Web Push notification ───
async function sendWebPush(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg', dir: 'rtl' })
  } else if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg', dir: 'rtl' })
    }
  }
}

// ─── חישוב Risk לדוח בודד ───
function calcReportRisk(report) {
  const flags = []
  if (report.e_status === 'פסול')                flags.push('עירוב פסול')
  if (report.k_cert === 'לא')                     flags.push('אין תעודת כשרות')
  if (parseInt(report.r_mezuzot_missing || 0) > 2) flags.push(`${report.r_mezuzot_missing} מזוזות חסרות`)
  if (report.p_mix === 'כן')                      flags.push('ערבוב בשר/חלב')
  return flags
}

// ─── ה-Hook הראשי ───
export function usePushAlerts({ enabled = true, role } = {}) {
  const channelRef = useRef(null)

  useEffect(() => {
    // רק פיקוד/אוגדה מקבלים התראות Realtime
    if (!enabled || !['pikud', 'ugda'].includes(role)) return

    // בקשת הרשאת Push בעת הרכבה (עדינה — לא חוסמת)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    channelRef.current = supabase
      .channel('realtime-reports')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          const r = payload.new
          const riskFlags = calcReportRisk(r)

          if (riskFlags.length === 0) {
            // דוח תקין — toast שקט בלבד
            toast.success(`✅ דוח חדש: ${r.base} (${r.unit})`, { duration: 3000 })
            return
          }

          // דוח עם בעיות — toast ואדום + Web Push
          const flagText = riskFlags.join(' · ')
          toast.error(
            `🚨 ליקוי חמור\n${r.base} — ${r.unit}\n${flagText}`,
            { duration: 8000, style: { maxWidth: '340px', textAlign: 'right', direction: 'rtl' } }
          )
          sendWebPush(
            `🚨 ליקוי חמור — ${r.base}`,
            `${r.unit}\n${flagText}`
          )
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [enabled, role])
}

// RealtimeAlerts מוגדר ב-App.jsx — ראה שם
