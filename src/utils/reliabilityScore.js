import { buildGpsAssessment } from './gpsAssessment'

/**
 * חישוב ציון אמינות לדוח
 * 0–100, כאשר 100 = אמינות מלאה
 */
export function calculateReliabilityScore(data, options = {}) {
  let score = 100
  const flags = []

  // זמן מילוי קצר מדי
  const elapsed = Number(data._elapsed_seconds)
  if (Number.isFinite(elapsed) && elapsed > 0) {
    if (elapsed < 45) {
      score -= 18
      flags.push('זמן מילוי קצר מדי (<45 שניות)')
    } else if (elapsed < 90) {
      score -= 8
      flags.push('זמן מילוי קצר (<90 שניות)')
    }
  }

  // Honeypot נלכד
  if (data._honeypot_triggered) {
    score -= 50
    flags.push('נלכד בשאלת אמת')
  }

  // ── בדיקת מרחק GPS מהמוצב המדווח ──────────────────────────────────────
  const lat = data.gps_lat || data.latitude
  const lon = data.gps_lon || data.longitude

  if (lat != null && lon != null && data.base) {
    const assessment = buildGpsAssessment({
      lat,
      lon,
      base: data.base,
      accuracy: options.accuracy,
      referenceCoords: options.referenceCoords,
    })

    if (assessment) {
      data._gps_distance_km = assessment.distKm

      if (assessment.level === 'danger') {
        score -= 18
        flags.push(`🚨 שיגור מרחוק: ${assessment.distKm.toFixed(1)} ק"מ מ-${data.base}`)
        data._gps_suspicious = true
      } else if (assessment.level === 'uncertain') {
        flags.push(`⚠️ GPS רחוק ${assessment.distKm.toFixed(1)} ק"מ, אבל הדיוק חלש (${assessment.accuracyMeters} מ')`)
      } else if (assessment.level === 'warning') {
        score -= 5
        flags.push(`⚠️ מרחק חריג מהמוצב: ${assessment.distKm.toFixed(1)} ק"מ`)
      }
    } else {
      flags.push(`⚠️ מוצב "${data.base}" אינו ברשימת הקואורדינטות — לא ניתן לאמת מיקום`)
    }
  }

  // חסר GPS
  if (lat == null || lon == null) {
    score -= 5
    flags.push('חסר מיקום GPS')
  }

  // תשובות סותרות פנימיות
  if (data.k_cert === 'לא' && data.k_issues === 'לא') {
    score -= 10
    flags.push('תשובות סותרות: אין תעודה + אין בעיות')
  }

  // כל שדות חובה ריקים
  const required = ['base', 'inspector', 'k_cert', 'e_status']
  const missingRequired = required.filter((k) => !data[k])
  if (missingRequired.length > 0) {
    score -= missingRequired.length * 5
    flags.push(`שדות חסרים: ${missingRequired.join(', ')}`)
  }

  return { score: Math.max(0, score), flags }
}

/**
 * צבע לפי ציון
 */
export function scoreColor(score) {
  if (score >= 85) return 'text-green-700'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export function scoreBgColor(score) {
  if (score >= 85) return 'bg-green-100'
  if (score >= 60) return 'bg-yellow-100'
  return 'bg-red-100'
}
