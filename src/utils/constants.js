// ======================================================
// קואורדינטות בסיסיות ידועות
// ======================================================
export const BASE_COORDINATES = {
  'מחנה עופר':    [32.1089, 35.1911],
  'בית אל':       [31.9333, 35.2167],
  'פסגות':        [31.9667, 35.2000],
  'מחנה שומרון':  [32.2167, 35.2833],
  'אריאל':        [32.1039, 35.1794],
  'קדומים':       [32.1667, 35.2000],
  'גוש עציון':    [31.6500, 35.1333],
  'אפרת':         [31.6500, 35.1333],
  'בית לחם':      [31.7050, 35.2061],
  'מחנה עציון':   [31.6500, 35.1333],
  'אלון שבות':    [31.6500, 35.1500],
  'מוצב אפרים':   [32.0500, 35.3000],
  'מוצב מנשה':    [32.3000, 35.1800],
  'מוצב הבקעה':   [31.8500, 35.4500],
}

// ======================================================
// ברקודים / QR לרבני חטמ״ר
// ======================================================
export const BASE_BARCODES = {
  'מחנה עופר':   'RB_OFER_99',
  'בית אל':      'RB_BETEL_88',
  'פסגות':       'RB_PSAGOT_77',
  'מחנה שומרון': 'RB_SHOMRON_66',
  'אריאל':       'RB_ARIEL_55',
  'קדומים':      'RB_KEDUMIM_44',
  'גוש עציון':   'RB_ETZION_33',
  'אפרת':        'RB_EFRAT_22',
  'בית לחם':     'RB_BLEHEM_11',
  'מחנה עציון':  'RB_ETZION_BASE',
  'אלון שבות':   'RB_ALON_SHEVUT',
  'מוצב אפרים':  'RB_EFRAIM_POS',
  'מוצב מנשה':   'RB_MENASHE_POS',
  'מוצב הבקעה':  'RB_BIKA_POS',
}

// ======================================================
// כל היחידות במערכת — חייב להתאים לLogin.jsx ול-unit_passwords
// ======================================================
export const REGIONAL_UNITS = [
  'חטמ״ר בנימין', 'חטמ״ר שומרון', 'חטמ״ר יהודה',
  'חטמ״ר עציון',  'חטמ״ר אפרים',  'חטמ״ר מנשה',  'חטמ״ר הבקעה',
]

export const REGULAR_UNITS = [
  'חטיבה 35', 'חטיבה 89', 'חטיבה 900',
]

export const COMMAND_UNITS = [
  'אוגדת 877', 'אוגדת 96', 'אוגדת 98', 'פיקוד מרכז',
]

export const ALL_UNITS = [
  ...REGIONAL_UNITS,
  ...REGULAR_UNITS,
  ...COMMAND_UNITS,
]

// ======================================================
// roles מוכרים
// ======================================================
export const ROLES = {
  PIKUD:  'pikud',
  UGDA:   'ugda',
  HATIVA: 'hativa',
  GDUD:   'gdud',
  GARIN:  'garin',
}

// ======================================================
// ציוני אמינות — threshold
// ======================================================
export const RELIABILITY_THRESHOLDS = {
  min_time_seconds: 120,
  min_gps_points:   1,
  honeypot_penalty: 50,
}

// ======================================================
// שאלות כשרות — Tab 1
// ======================================================
export const KASHRUT_QUESTIONS = [
  { key: 'k_cert',       label: 'תעודת כשרות בתוקף',      type: 'yesno' },
  { key: 'k_cert_expiry',label: 'תאריך תפוגת תעודה',       type: 'date' },
  { key: 'k_issues',     label: 'תקלות כשרות',             type: 'yesno' },
  { key: 'k_issues_description', label: 'פירוט תקלה',      type: 'text', conditional: { key: 'k_issues', value: 'כן' } },
  { key: 'k_separation', label: 'הפרדה בין חלבי/בשרי',     type: 'yesno' },
  { key: 'p_mix',        label: 'ערבוב כלים',               type: 'yesno' },
  { key: 'k_products',   label: 'מוצרים בעייתיים',          type: 'yesno' },
  { key: 'k_bishul',     label: 'בישול ישראל',              type: 'yesno' },
  { key: 'e_status',     label: 'סטטוס עירוב (מטבח)',       type: 'select', options: ['תקין', 'פסול', 'לא רלוונטי'] },
  { key: 'k_shabbat_hot',label: 'שמירת חום לשבת',          type: 'yesno' },
  { key: 'k_chalav',     label: 'חלב ישראל',                type: 'yesno' },
  { key: 'k_bread',      label: 'לחם בכשרות מתאימה',       type: 'yesno' },
]

// ======================================================
// פלטת צבעים לפי יחידה
// ======================================================
export const UNIT_COLORS = {
  'חטיבה 35':     '#e53935',
  'חטיבה 89':     '#1e88e5',
  'חטיבה 900':    '#43a047',
  'פיקוד מרכז':   '#8e24aa',
  'אוגדת 98':     '#fb8c00',
  'אוגדת 877':    '#00acc1',
  'אוגדת 96':     '#d81b60',
  default:         '#546e7a',
}

// ======================================================
// Honeypot
// ======================================================
export const HONEYPOT_QUESTIONS = [
  { base: 'default', question: 'בסיס זה הוא מחנה עציון', correct_answer: false, label: 'שאלת אמת' },
]

// ======================================================
// QR דינמי — QR payload מכיל קואורדינטות + קוד בסיס
// פורמט: BASE=<code>|LAT=<lat>|LON=<lon>|NAME=<name>
// ======================================================
export function buildDynamicQR(baseName) {
  const code   = BASE_BARCODES[baseName]
  const coords = BASE_COORDINATES[baseName]
  if (!code || !coords) return null
  const [lat, lon] = coords
  return `BASE=${code}|LAT=${lat}|LON=${lon}|NAME=${encodeURIComponent(baseName)}`
}

/**
 * פענוח QR דינמי — מחזיר { code, lat, lon, name } או null
 */
export function parseDynamicQR(raw) {
  if (!raw) return null
  // תמיכה גם ב-QR ישן (קוד בלבד) וגם בחדש (pipe-separated)
  if (!raw.includes('|')) {
    const entry = Object.entries(BASE_BARCODES).find(([, v]) => v === raw)
    return entry ? { code: raw, name: entry[0], lat: null, lon: null } : null
  }
  const parts = Object.fromEntries(raw.split('|').map(p => p.split('=')))
  const name  = decodeURIComponent(parts.NAME || '')
  const lat   = parseFloat(parts.LAT)
  const lon   = parseFloat(parts.LON)
  if (!parts.BASE || isNaN(lat) || isNaN(lon)) return null
  return { code: parts.BASE, name, lat, lon }
}
