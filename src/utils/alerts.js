import { supabase } from '../supabaseClient'

/**
 * שליחת התראת WhatsApp (link-based)
 */
export async function sendWhatsAppAlert(message, unit) {
  try {
    const { data } = await supabase
      .from('whatsapp_numbers')
      .select('phone')
      .eq('unit', unit)
      .single()

    if (data?.phone) {
      const encoded = encodeURIComponent(message)
      return `https://wa.me/${data.phone}?text=${encoded}`
    }
  } catch (e) {
    console.warn('WhatsApp alert failed:', e)
  }
  return null
}

/**
 * שליחת מייל דרך Vercel API route
 */
export async function sendEmailAlert(reportData, unit) {
  const alerts = []

  if (reportData.e_status === 'פסול') alerts.push(`🚨 עירוב פסול במוצב ${reportData.base}`)
  if (reportData.k_cert === 'לא') alerts.push(`🔴 כשרות חסרה במוצב ${reportData.base}`)
  const mezuzot = parseInt(reportData.r_mezuzot_missing || 0)
  if (mezuzot >= 5) alerts.push(`📜 ${mezuzot} מזוזות חסרות במוצב ${reportData.base}`)
  if (reportData.p_mix === 'כן') alerts.push(`⚠️ ערבוב כלים במוצב ${reportData.base}`)

  if (alerts.length === 0) return

  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts, unit, reportData }),
    })
  } catch (e) {
    console.warn('Email alert failed:', e)
  }
}

/**
 * בדיקת חריגויות ובנייה של רשימת התראות
 */
export function buildAlertsList(report) {
  const list = []
  if (report.e_status === 'פסול') list.push({ type: 'error', msg: 'עירוב פסול' })
  if (report.k_cert === 'לא') list.push({ type: 'error', msg: 'אין תעודת כשרות' })
  if (parseInt(report.r_mezuzot_missing || 0) >= 5)
    list.push({ type: 'warn', msg: `${report.r_mezuzot_missing} מזוזות חסרות` })
  if (report.p_mix === 'כן') list.push({ type: 'warn', msg: 'ערבוב כלים' })
  if (report.k_issues === 'כן') list.push({ type: 'warn', msg: 'תקלות כשרות' })
  return list
}
