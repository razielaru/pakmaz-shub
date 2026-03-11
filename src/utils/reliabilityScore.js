/**
 * חישוב ציון אמינות לדוח
 * 0–100, כאשר 100 = אמינות מלאה
 */
export function calculateReliabilityScore(data) {
  let score = 100
  const flags = []

  // זמן מילוי קצר מדי
  const elapsed = data._elapsed_seconds || 0
  if (elapsed < 60) {
    score -= 30
    flags.push('זמן מילוי קצר מדי (<60 שניות)')
  } else if (elapsed < 120) {
    score -= 15
    flags.push('זמן מילוי קצר (<120 שניות)')
  }

  // Honeypot נלכד
  if (data._honeypot_triggered) {
    score -= 50
    flags.push('נלכד בשאלת אמת')
  }

  // חסר GPS
  if (!data.gps_lat || !data.gps_lon) {
    score -= 10
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
