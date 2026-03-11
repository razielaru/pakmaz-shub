// ======================================================
// קואורדינטות בסיסיות ידועות
// ======================================================
export const BASE_COORDINATES = {
  'מחנה עופר': [32.1089, 35.1911],
  'בית אל': [31.9333, 35.2167],
  'פסגות': [31.9667, 35.2000],
  'מחנה שומרון': [32.2167, 35.2833],
  'אריאל': [32.1039, 35.1794],
  'קדומים': [32.1667, 35.2000],
  'גוש עציון': [31.6500, 35.1333],
  'אפרת': [31.6500, 35.1333],
  'בית לחם': [31.7050, 35.2061],
  'מחנה עציון': [31.6500, 35.1333],
  'אלון שבות': [31.6500, 35.1500],
  'מוצב אפרים': [32.0500, 35.3000],
  'מוצב מנשה': [32.3000, 35.1800],
  'מוצב הבקעה': [31.8500, 35.4500],
}

// ======================================================
// ברקודים / QR לרבני חטמ"ר
// ======================================================
export const BASE_BARCODES = {
  'מחנה עופר': 'RB_OFER_99',
  'בית אל': 'RB_BETEL_88',
  'פסגות': 'RB_PSAGOT_77',
  'מחנה שומרון': 'RB_SHOMRON_66',
  'אריאל': 'RB_ARIEL_55',
  'קדומים': 'RB_KEDUMIM_44',
  'גוש עציון': 'RB_ETZION_33',
  'אפרת': 'RB_EFRAT_22',
  'בית לחם': 'RB_BLEHEM_11',
  'מחנה עציון': 'RB_ETZION_BASE',
  'אלון שבות': 'RB_ALON_SHEVUT',
  'מוצב אפרים': 'RB_EFRAIM_POS',
  'מוצב מנשה': 'RB_MENASHE_POS',
  'מוצב הבקעה': 'RB_BIKA_POS',
}

// ======================================================
// כל היחידות במערכת
// ======================================================
export const ALL_UNITS = [
  'חטיבה 35',
  'חטיבה 89',
  'חטיבה 900',
  'פיקוד מרכז',
  'אוגדה 98',
  'אוגדה 162',
  'גדוד 51',
  'גדוד 202',
  'גדוד 890',
  'גרעין ירושלים',
  'גרעין שומרון',
  'גרעין עציון',
]

// ======================================================
// roles מוכרים
// ======================================================
export const ROLES = {
  PIKUD: 'pikud',
  UGDA: 'ugda',
  HATIVA: 'hativa',
  GDUD: 'gdud',
  GARIN: 'garin',
}

// ======================================================
// ציוני אמינות — threshold לכל בעיה
// ======================================================
export const RELIABILITY_THRESHOLDS = {
  min_time_seconds: 120,   // זמן מינימום למילוי
  min_gps_points: 1,       // נקודות GPS מינימום
  honeypot_penalty: 50,    // קנס על honeypot
}

// ======================================================
// שאלות כשרות — Tab 1
// ======================================================
export const KASHRUT_QUESTIONS = [
  { key: 'k_cert', label: 'תעודת כשרות בתוקף', type: 'yesno' },
  { key: 'k_cert_expiry', label: 'תאריך תפוגת תעודה', type: 'date' },
  { key: 'k_issues', label: 'תקלות כשרות', type: 'yesno' },
  { key: 'k_issues_description', label: 'פירוט תקלה', type: 'text', conditional: { key: 'k_issues', value: 'כן' } },
  { key: 'k_separation', label: 'הפרדה בין חלבי/בשרי', type: 'yesno' },
  { key: 'p_mix', label: 'ערבוב כלים', type: 'yesno' },
  { key: 'k_products', label: 'מוצרים בעייתיים', type: 'yesno' },
  { key: 'k_bishul', label: 'בישול ישראל', type: 'yesno' },
  { key: 'e_status', label: 'סטטוס עירוב (מטבח)', type: 'select', options: ['תקין', 'פסול', 'לא רלוונטי'] },
  { key: 'k_shabbat_hot', label: 'שמירת חום לשבת', type: 'yesno' },
  { key: 'k_chalav', label: 'חלב ישראל', type: 'yesno' },
  { key: 'k_bread', label: 'לחם בכשרות מתאימה', type: 'yesno' },
]

// ======================================================
// שאלות טרקלין — Tab 2
// ======================================================
export const LOUNGE_QUESTIONS = [
  { key: 't_private', label: 'חדר פרטי לרב', type: 'yesno' },
  { key: 't_kitchen_tools', label: 'כלי מטבח בטרקלין', type: 'yesno' },
  { key: 't_procedure', label: 'נוהל טרקלין', type: 'yesno' },
  { key: 't_friday', label: 'הכנות יום שישי', type: 'yesno' },
  { key: 't_app', label: 'אפליקציה', type: 'yesno' },
  { key: 'w_location', label: 'מיקום וויקוק', type: 'text' },
  { key: 'w_private', label: 'פרטיות וויקוק', type: 'yesno' },
  { key: 'w_kitchen_tools', label: 'כלי מטבח וויקוק', type: 'yesno' },
  { key: 'w_procedure', label: 'נוהל וויקוק', type: 'yesno' },
  { key: 'w_guidelines', label: 'הנחיות וויקוק', type: 'yesno' },
]

// ======================================================
// שאלות בית כנסת ועירוב — Tab 3
// ======================================================
export const SYNAGOGUE_QUESTIONS = [
  { key: 'e_status_shul', label: 'עירוב בית כנסת', type: 'select', options: ['תקין', 'פסול', 'לא קיים'] },
  { key: 's_torah_id', label: 'ס"ת — מזוהה', type: 'yesno' },
  { key: 's_torah_nusach', label: 'נוסח ס"ת', type: 'select', options: ['אשכנז', 'ספרד', 'ספרדי', 'אחר'] },
  { key: 'r_mezuzot_missing', label: 'מזוזות חסרות (מספר)', type: 'number' },
  { key: 'r_torah_missing', label: 'ס"ת חסרים', type: 'yesno' },
  { key: 'missing_items', label: 'חוסרים נוספים', type: 'text' },
  { key: 'siddur_qty', label: 'כמות סידורים', type: 'number' },
  { key: 'shul_condition', label: 'מצב בית הכנסת', type: 'select', options: ['טוב', 'בינוני', 'גרוע'] },
]

// ======================================================
// שאלות נהלים ורוח — Tab 4
// ======================================================
export const SPIRIT_QUESTIONS = [
  { key: 'soldier_want_lesson', label: 'חיילים רוצים שיעור תורה', type: 'yesno' },
  { key: 'soldier_has_lesson', label: 'יש שיעור קבוע', type: 'yesno' },
  { key: 'soldier_lesson_teacher', label: 'שם המלמד', type: 'text', conditional: { key: 'soldier_has_lesson', value: 'כן' } },
  { key: 'soldier_lesson_phone', label: 'טלפון מלמד', type: 'tel', conditional: { key: 'soldier_has_lesson', value: 'כן' } },
  { key: 'soldier_yeshiva', label: 'ישיבה מחוברת', type: 'text' },
  { key: 'spirit_general', label: 'רוח כללית של היחידה', type: 'select', options: ['גבוהה', 'בינונית', 'נמוכה'] },
  { key: 'shabbat_quality', label: 'איכות שבת', type: 'select', options: ['טובה', 'בינונית', 'לוקה בחסר'] },
  { key: 'rabbi_contact', label: 'קשר עם הרב', type: 'select', options: ['טוב', 'בינוני', 'חסר'] },
  { key: 'tefillin_available', label: 'זמינות תפילין', type: 'yesno' },
  { key: 'free_text', label: 'הערות חופשיות', type: 'textarea' },
]

// ======================================================
// פלטת צבעים לפי יחידה (מפה)
// ======================================================
export const UNIT_COLORS = {
  'חטיבה 35': '#e53935',
  'חטיבה 89': '#1e88e5',
  'חטיבה 900': '#43a047',
  'פיקוד מרכז': '#8e24aa',
  'אוגדה 98': '#fb8c00',
  'אוגדה 162': '#00acc1',
  default: '#546e7a',
}

// ======================================================
// Honeypot questions (anti-fraud)
// ======================================================
export const HONEYPOT_QUESTIONS = [
  {
    base: 'default',
    question: 'בסיס זה הוא מחנה עציון',
    correct_answer: false,
    label: 'שאלת אמת',
  },
]
