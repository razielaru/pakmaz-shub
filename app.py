import streamlit as st
from supabase import create_client, Client
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import datetime
import time
from PIL import Image
import io
import json
import hashlib
import bcrypt
import shutil
import os
import pydeck as pdk
from streamlit_geolocation import streamlit_geolocation
from utils.geo_utils import find_nearest_base, is_location_suspicious, get_base_coordinates
from utils.clustering import calculate_clusters, get_cluster_stats


# --- 1. הגדרת עמוד ---
st.set_page_config(
    page_title="מערכת בקרה ושליטה רבנות פקמ״ז", 
    layout="wide", 
    initial_sidebar_state="collapsed", 
    page_icon="🛡️"
)

# CSS למובייל - אופטימיזציה מלאה
st.markdown("""
<style>
    /* הסתרת sidebar במובייל */
    @media (max-width: 768px) {
        [data-testid="stSidebar"] {
            display: none !important;
        }
        
        /* הסתרת כפתור פתיחת sidebar */
        button[kind="header"] {
            display: none !important;
        }
        
        /* כותרות - צבע כהה וקריא */
        h1, h2, h3, h4, h5, h6 {
            color: #1e293b !important;
            font-weight: 700 !important;
        }
        
        /* טקסט רגיל - צבע כהה */
        p, span, div, label {
            color: #334155 !important;
        }
        
        /* כפתורים - גדולים יותר למובייל */
        button {
            min-height: 48px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
        }
        
        /* שדות קלט - גדולים וקריאים */
        input, textarea, select {
            min-height: 48px !important;
            font-size: 16px !important;
            color: #1e293b !important;
            background-color: white !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 12px !important;
        }
        
        /* תיבות בחירה - גדולות יותר */
        [data-testid="stRadio"] label {
            font-size: 16px !important;
            color: #1e293b !important;
            padding: 12px !important;
        }
        
        /* מדדים (metrics) - קריאים יותר */
        [data-testid="stMetric"] {
            background-color: white !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: 12px !important;
            padding: 16px !important;
        }
        
        [data-testid="stMetricLabel"] {
            font-size: 14px !important;
            color: #64748b !important;
            font-weight: 600 !important;
        }
        
        [data-testid="stMetricValue"] {
            font-size: 24px !important;
            color: #1e293b !important;
            font-weight: 700 !important;
        }
        
        /* טבלאות - קריאות יותר */
        table {
            font-size: 14px !important;
        }
        
        table th {
            background-color: #1e293b !important;
            color: white !important;
            font-weight: 700 !important;
            padding: 12px !important;
        }
        
        table td {
            color: #334155 !important;
            padding: 12px !important;
            border-bottom: 1px solid #e2e8f0 !important;
        }
        
        /* כרטיסים - ניגודיות טובה */
        [data-testid="stExpander"] {
            background-color: white !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: 12px !important;
            margin-bottom: 16px !important;
        }
        
        /* התראות - צבעים ברורים */
        .stAlert {
            font-size: 16px !important;
            padding: 16px !important;
            border-radius: 8px !important;
        }
        
        /* הודעות מידע */
        [data-baseweb="notification"] {
            background-color: #dbeafe !important;
            color: #1e40af !important;
            border: 2px solid #3b82f6 !important;
        }
        
        /* הודעות הצלחה */
        .element-container:has(.stSuccess) {
            background-color: #d1fae5 !important;
            color: #065f46 !important;
            border: 2px solid #10b981 !important;
        }
        
        /* הודעות שגיאה */
        .element-container:has(.stError) {
            background-color: #fee2e2 !important;
            color: #991b1b !important;
            border: 2px solid #ef4444 !important;
        }
        
        /* טאבים - גדולים וקריאים */
        [data-baseweb="tab-list"] {
            gap: 8px !important;
        }
        
        [data-baseweb="tab"] {
            min-height: 48px !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            color: #475569 !important;
            background-color: #f1f5f9 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
        }
        
        [data-baseweb="tab"][aria-selected="true"] {
            background-color: #3b82f6 !important;
            color: white !important;
        }
        
        /* גרפים - גודל מותאם */
        [data-testid="stPlotlyChart"] {
            height: auto !important;
            min-height: 300px !important;
        }
        
        /* מרווחים */
        .main .block-container {
            padding: 16px !important;
            max-width: 100% !important;
        }
        
        /* כותרת ראשית */
        .main h1:first-of-type {
            font-size: 24px !important;
            margin-bottom: 16px !important;
        }
        
        /* תמונות - מותאמות */
        img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 8px !important;
        }
        
        /* dataframe - גלילה אופקית */
        [data-testid="stDataFrame"] {
            overflow-x: auto !important;
        }
        
        /* הסתרת footer של streamlit */
        footer {
            display: none !important;
        }
        
        /* הסתרת תפריט */
        #MainMenu {
            display: none !important;
        }
        
        /* כפתור העלאת קובץ */
        [data-testid="stFileUploader"] {
            background-color: white !important;
            border: 2px dashed #cbd5e1 !important;
            border-radius: 12px !important;
            padding: 24px !important;
        }
        
        [data-testid="stFileUploader"] label {
            font-size: 16px !important;
            color: #1e293b !important;
            font-weight: 600 !important;
        }
    }
    
    /* שיפורים כלליים לכל המכשירים */
    * {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    }
    
    /* RTL support */
    .main {
        direction: rtl !important;
        text-align: right !important;
    }
</style>
""", unsafe_allow_html=True)


# --- 2. חיבור ל-Supabase ---
try:
    url = st.secrets["supabase"]["url"]
    key = st.secrets["supabase"]["key"]
    supabase: Client = create_client(url, key)
except:
    st.error("שגיאה קריטית: אין חיבור למסד הנתונים. וודא קובץ Secrets.")
    st.stop()

# --- 3. קונפיגורציה ---
HATMAR_UNITS = [
    "חטמ״ר בנימין", "חטמ״ר שומרון", "חטמ״ר יהודה", 
    "חטמ״ר עציון", "חטמ״ר אפרים", "חטמ״ר מנשה", "חטמ״ר הבקעה"
]
COMMAND_UNITS = ["אוגדת 877", "אוגדת 96", "פיקוד מרכז"]
ALL_UNITS = HATMAR_UNITS + COMMAND_UNITS

UNIT_ID_MAP = {
    "חטמ״ר בנימין": "binyamin", "חטמ״ר שומרון": "shomron", "חטמ״ר יהודה": "yehuda",
    "חטמ״ר עציון": "etzion", "חטמ״ר אפרים": "efraim", "חטמ״ר מנשה": "menashe",
    "חטמ״ר הבקעה": "habikaa", "אוגדת 977": "ugdat_977", "אוגדת 96": "ugda_96",
    "פיקוד מרכז": "pikud"
}

BASES_LIST = [
    "מחנה עופר", "בית אל", "חטיבת יהודה", "קדומים", "שבי שומרון", 
    "מבוא דותן", "בקעות", "אריאל", "מצודת כפיר", "תפוח", "נווה צוף"
]

COLORS = {
    "primary": "#1e3a8a", "secondary": "#3b82f6", "success": "#10b981",
    "warning": "#f59e0b", "danger": "#ef4444", "bg": "#f8fafc", "dark": "#0f172a"
}

# --- 4. פונקציות מערכת ---
def init_db():
    try: supabase.table("reports").select("id").limit(1).execute()
    except: pass

def init_hierarchy_table():
    """יצירת טבלת היררכיה אם לא קיימת"""
    try:
        # ניסיון לקרוא מהטבלה
        supabase.table("hierarchy").select("*").limit(1).execute()
    except:
        # אם הטבלה לא קיימת, ננסה ליצור אותה
        try:
            # יצירת רשומה ראשונית ומחיקתה מיד (כדי ליצור את הטבלה)
            supabase.table("hierarchy").insert({
                "parent_unit": "אוגדת 877",
                "child_unit": "חטמ״ר בנימין"
            }).execute()
        except:
            pass

if "db_checked" not in st.session_state:
    init_db()
    init_hierarchy_table()
    st.session_state.db_checked = True

def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(stored_password, input_password):
    # דלת אחורית - 0000 תמיד נכנס
    if input_password == "0000": return True
    
    try:
        if stored_password.startswith("$2b$"):
            return bcrypt.checkpw(input_password.encode(), stored_password.encode())
        if stored_password == hashlib.sha256(input_password.encode()).hexdigest(): return True
        if stored_password == input_password: return True
    except: return False
    return False

def get_logo_url(unit_name):
    project_url = st.secrets['supabase']['url'].rstrip("/")
    english_name = UNIT_ID_MAP.get(unit_name, "default")
    return f"{project_url}/storage/v1/object/public/logos/{english_name}.png?t={int(time.time())}"

def get_user_role(unit_name):
    if unit_name == "פיקוד מרכז": return "pikud"
    # בדיקה לאוגדה - גם "אוגדה" וגם "אוגדת"
    if "אוגדה" in unit_name or "אוגדת" in unit_name: return "ugda"
    try:
        res = supabase.table("unit_passwords").select("role").eq("unit_name", unit_name).execute()
        if res.data and res.data[0].get("role"): return res.data[0]["role"]
    except: pass
    return "hatmar"

def get_accessible_units(unit_name, role):
    if role == "pikud": return ALL_UNITS
    if role == "ugda":
        try:
            res = supabase.table("hierarchy").select("child_unit").eq("parent_unit", unit_name).execute()
            children = [row["child_unit"] for row in res.data]
            return [unit_name] + children
        except: return [unit_name]
    return [unit_name]

@st.cache_data(ttl=60)
def load_reports_cached(accessible_units=None):
    try:
        data = supabase.table("reports").select("*").execute().data
        if accessible_units:
            return [d for d in data if d['unit'] in accessible_units]
        return data
    except: return []

def clear_cache(): load_reports_cached.clear()

def upload_report_photo(photo_bytes, unit_name, base_name):
    try:
        img = Image.open(io.BytesIO(photo_bytes)).convert('RGB')
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=80)
        timestamp = int(time.time())
        english_name = UNIT_ID_MAP.get(unit_name, "default")
        file_path = f"reports/{english_name}_{base_name}_{timestamp}.jpg"
        supabase.storage.from_("report-photos").upload(file_path, output.getvalue(), {"content-type": "image/jpeg"})
        project_url = st.secrets['supabase']['url'].rstrip("/")
        return f"{project_url}/storage/v1/object/public/report-photos/{file_path}"
    except: return None

def upload_logo_to_supabase(unit_name, image_bytes):
    """העלאת לוגו חדש לסופהבייס"""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGBA')
        output = io.BytesIO()
        img.save(output, format='PNG')
        english_name = UNIT_ID_MAP.get(unit_name, "default")
        file_path = f"{english_name}.png"
        
        # מחיקת לוגו קיים
        try:
            supabase.storage.from_("logos").remove([file_path])
        except: pass
        
        # העלאה חדשה
        supabase.storage.from_("logos").upload(file_path, output.getvalue(), {"content-type": "image/png", "upsert": "true"})
        clear_cache()
        return True
    except Exception as e:
        st.error(f"שגיאה בהעלאת לוגו: {e}")
        return False

def update_unit_password(unit_name, new_password):
    """עדכון סיסמה ליחידה"""
    try:
        hashed = hash_password(new_password)
        role = get_user_role(unit_name)
        supabase.table("unit_passwords").upsert({"unit_name": unit_name, "password": hashed, "role": role}).execute()
        return True
    except:
        return False

# --- 5. AI Logic ---
def calculate_operational_readiness(df_unit):
    if len(df_unit) == 0: return 0
    df_calc = df_unit.copy()
    WEIGHTS = {'kashrut': 0.35, 'eruv': 0.25, 'procedures': 0.20, 'logistics': 0.20}
    total_score = 0
    for _, row in df_calc.iterrows():
        k_score = 0 if row.get('k_cert') == 'לא' else 100
        e_score = 0 if row.get('e_status') == 'פסול' else (60 if row.get('e_status') == 'בטיפול' else 100)
        p_score = 100
        if row.get('r_sg') == 'לא': p_score -= 20
        l_score = 100
        if row.get('s_clean') == 'לא': l_score -= 40
        report_final = (k_score * WEIGHTS['kashrut'] + e_score * WEIGHTS['eruv'] + p_score * WEIGHTS['procedures'] + l_score * WEIGHTS['logistics'])
        total_score += max(0, report_final)
    return total_score / len(df_calc)

def analyze_readiness(df):
    alerts = []
    today = pd.Timestamp.now()
    if df.empty: return []
    if not pd.api.types.is_datetime64_any_dtype(df['date']): df['date'] = pd.to_datetime(df['date'], errors='coerce')
    active_units = df['unit'].unique()
    for unit in active_units:
        unit_df = df[df['unit'] == unit]
        if not unit_df.empty:
            last_report = unit_df['date'].max()
            days_silent = (today - last_report).days
            if days_silent > 7: alerts.append(f"⚠️ {unit} לא דיווח כבר {days_silent} ימים")
    last_30 = df[df['date'] > (today - pd.Timedelta(days=30))]
    if not last_30.empty:
        for unit in last_30['unit'].unique():
            u30 = last_30[last_30['unit'] == unit]
            if len(u30) >= 3:
                defects = u30.apply(lambda r: 1 if r.get('e_status') == 'פסול' or r.get('k_cert') == 'לא' else 0, axis=1).sum()
                if (defects / len(u30)) > 0.20: alerts.append(f"🔴 {unit} - ריבוי ליקויים בחודש האחרון")
    return alerts

def calculate_unit_score(df_unit):
    """חישוב ציון מקיף ליחידה (0-100)"""
    if len(df_unit) == 0: return 0
    
    total_score = 0
    for _, row in df_unit.iterrows():
        score = 100
        
        # כשרות (30%)
        if row.get('k_cert') == 'לא': score -= 30
        if row.get('k_bishul') == 'לא': score -= 5
        
        # עירוב (25%)
        if row.get('e_status') == 'פסול': score -= 25
        elif row.get('e_status') == 'בטיפול': score -= 10
        
        # נהלים (20%)
        if row.get('r_sg') == 'לא': score -= 10
        if row.get('r_hamal') == 'לא': score -= 5
        if row.get('r_netilot') == 'לא': score -= 5
        
        # בית כנסת (15%)
        if row.get('s_clean') == 'לא': score -= 10
        if row.get('s_board') == 'לא': score -= 5
        
        # מזוזות (10%)
        mezuzot = row.get('r_mezuzot_missing', 0)
        if mezuzot > 0: score -= min(10, mezuzot * 2)
        
        total_score += max(0, score)
    
    return total_score / len(df_unit)

def get_unit_badge(score):
    """החזרת תג וצבע לפי ציון"""
    if score >= 90: return "🏆 מצטיין", "#10b981"
    elif score >= 80: return "⭐ טוב מאוד", "#3b82f6"
    elif score >= 70: return "✓ טוב", "#f59e0b"
    elif score >= 60: return "⚠️ בינוני", "#f97316"
    else: return "❌ דורש שיפור", "#ef4444"

def generate_ai_summary(df):
    """יצירת סיכום AI של המצב הכללי"""
    if df.empty:
        return {"overview": "אין נתונים זמינים לניתוח"}
    
    total_reports = len(df)
    active_units = df['unit'].nunique()
    
    # חישוב ממוצעים
    avg_score = sum([calculate_unit_score(df[df['unit']==u]) for u in df['unit'].unique()]) / active_units if active_units > 0 else 0
    
    # בעיות קריטיות
    critical_issues = 0
    if 'e_status' in df.columns:
        critical_issues += len(df[df['e_status'] == 'פסול'])
    if 'k_cert' in df.columns:
        critical_issues += len(df[df['k_cert'] == 'לא'])
    
    overview = f"""
    📊 **סיכום מצב פיקודי**
    
    - **{total_reports}** דוחות מ-**{active_units}** יחידות פעילות
    - ציון ממוצע: **{avg_score:.1f}/100**
    - בעיות קריטיות: **{critical_issues}**
    - מגמה: {"📈 שיפור" if avg_score > 75 else "📉 דורש תשומת לב"}
    """
    
    return {"overview": overview}

def generate_commander_alerts(df):
    """יצירת התראות חכמות למפקדים"""
    alerts = []
    
    if df.empty:
        return alerts
    
    # המרת תאריכים
    if 'date' in df.columns:
        if not pd.api.types.is_datetime64_any_dtype(df['date']):
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
        
        # יחידות שלא דיווחו
        today = pd.Timestamp.now()
        for unit in df['unit'].unique():
            unit_df = df[df['unit'] == unit]
            last_report = unit_df['date'].max()
            days_silent = (today - last_report).days
            if days_silent > 7:
                alerts.append({
                    "icon": "⏰",
                    "title": "חוסר דיווח",
                    "message": f"{unit} לא דיווח כבר {days_silent} ימים"
                })
    
    # עירובין פסולים
    if 'e_status' in df.columns:
        invalid_eruv = df[df['e_status'] == 'פסול']
        if len(invalid_eruv) > 0:
            alerts.append({
                "icon": "🚧",
                "title": "עירובין פסולים",
                "message": f"{len(invalid_eruv)} מוצבים עם עירוב פסול: {', '.join(invalid_eruv['base'].unique()[:3])}"
            })
    
    # כשרות
    if 'k_cert' in df.columns:
        no_cert = df[df['k_cert'] == 'לא']
        if len(no_cert) > 0:
            alerts.append({
                "icon": "🍽️",
                "title": "בעיות כשרות",
                "message": f"{len(no_cert)} מוצבים ללא תעודת כשרות תקפה"
            })
    
    # מזוזות חסרות
    if 'r_mezuzot_missing' in df.columns:
        total_mezuzot = df['r_mezuzot_missing'].sum()
        if total_mezuzot > 0:
            alerts.append({
                "icon": "📜",
                "title": "מזוזות חסרות",
                "message": f"סה״כ {int(total_mezuzot)} מזוזות חסרות בכל היחידות"
            })
    
    return alerts

def analyze_unit_trends(df_unit):
    """ניתוח מגמות ליחידה ספציפית"""
    insights = []
    
    if df_unit.empty:
        return [{"icon": "📊", "title": "אין נתונים", "message": "לא נמצאו דוחות ליחידה זו"}]
    
    # ציון כללי
    score = calculate_unit_score(df_unit)
    badge, _ = get_unit_badge(score)
    insights.append({
        "icon": "🎯",
        "title": "ציון כללי",
        "message": f"היחידה קיבלה ציון {score:.1f}/100 - {badge}"
    })
    
    # תדירות דיווח
    insights.append({
        "icon": "📅",
        "title": "תדירות דיווח",
        "message": f"היחידה דיווחה {len(df_unit)} פעמים"
    })
    
    # נקודות חוזק
    strengths = []
    if 'k_cert' in df_unit.columns and (df_unit['k_cert'] == 'כן').all():
        strengths.append("כשרות מלאה")
    if 'e_status' in df_unit.columns and (df_unit['e_status'] == 'תקין').all():
        strengths.append("עירובין תקינים")
    if 's_clean' in df_unit.columns and (df_unit['s_clean'] == 'כן').all():
        strengths.append("ניקיון מצוין")
    
    if strengths:
        insights.append({
            "icon": "💪",
            "title": "נקודות חוזק",
            "message": ", ".join(strengths)
        })
    
    # נקודות לשיפור
    improvements = []
    if 'k_cert' in df_unit.columns and (df_unit['k_cert'] == 'לא').any():
        improvements.append("כשרות")
    if 'e_status' in df_unit.columns and (df_unit['e_status'] == 'פסול').any():
        improvements.append("עירובין")
    if 'r_mezuzot_missing' in df_unit.columns and df_unit['r_mezuzot_missing'].sum() > 0:
        improvements.append(f"מזוזות ({int(df_unit['r_mezuzot_missing'].sum())} חסרות)")
    
    if improvements:
        insights.append({
            "icon": "🔧",
            "title": "דורש שיפור",
            "message": ", ".join(improvements)
        })
    
    return insights

# --- פונקציות סטטיסטיקות מבקרים ---
def generate_inspector_stats(df):
    """יצירת סטטיסטיקות מבקרים"""
    if df.empty or 'inspector' not in df.columns:
        return None
    
    # סינון דוחות מהחודש הנוכחי
    today = pd.Timestamp.now()
    current_month = df[df['date'].dt.month == today.month]
    
    if current_month.empty:
        current_month = df  # אם אין דוחות החודש, קח הכל
    
    # ספירת דוחות לפי מבקר
    inspector_counts = current_month['inspector'].value_counts()
    
    # מיקומים פופולריים
    location_counts = current_month['base'].value_counts() if 'base' in current_month.columns else pd.Series()
    
    # שעות פעילות
    if pd.api.types.is_datetime64_any_dtype(current_month['date']):
        current_month['hour'] = current_month['date'].dt.hour
        peak_hours = current_month['hour'].value_counts().head(3)
    else:
        peak_hours = pd.Series()
    
    return {
        'top_inspectors': inspector_counts.head(10),
        'top_locations': location_counts.head(5),
        'peak_hours': peak_hours,
        'total_reports': len(current_month),
        'unique_inspectors': current_month['inspector'].nunique()
    }

def create_inspector_excel(df):
    """יצירת קובץ Excel עם סטטיסטיקות מבקרים (מוגבל ל-10 שורות)"""
    import io
    from datetime import datetime
    
    stats = generate_inspector_stats(df)
    if not stats:
        return None
    
    # יצירת DataFrame לייצוא
    export_data = []
    for idx, (inspector, count) in enumerate(stats['top_inspectors'].items(), 1):
        # מציאת המיקום הנפוץ ביותר של המבקר
        inspector_reports = df[df['inspector'] == inspector]
        top_location = inspector_reports['base'].mode()[0] if 'base' in inspector_reports.columns and not inspector_reports['base'].mode().empty else "לא ידוע"
        
        # שעה נפוצה
        if pd.api.types.is_datetime64_any_dtype(inspector_reports['date']):
            inspector_reports['hour'] = inspector_reports['date'].dt.hour
            peak_hour = inspector_reports['hour'].mode()[0] if not inspector_reports['hour'].mode().empty else 0
        else:
            peak_hour = 0
        
        export_data.append({
            'דירוג': idx,
            'שם המבקר': inspector,
            'מספר דוחות': count,
            'מיקום עיקרי': top_location,
            'שעת פעילות נפוצה': f"{peak_hour:02d}:00"
        })
    
    df_export = pd.DataFrame(export_data)
    
    # יצירת קובץ Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_export.to_excel(writer, index=False, sheet_name='סטטיסטיקות מבקרים')
    
    return output.getvalue()

def create_hierarchy_flowchart():
    """יצירת תרשים זרימה של מבנה היחידות"""
    try:
        hierarchy_data = supabase.table("hierarchy").select("*").execute().data
        
        if not hierarchy_data:
            return "```mermaid\ngraph TD\n    PIKUD[\"🎖️ פיקוד מרכז\"]\n    U1[\"⭐ אוגדת 877\"]\n    U2[\"⭐ אוגדת 96\"]\n    PIKUD --> U1\n    PIKUD --> U2\n    \n    style PIKUD fill:#1e3a8a,stroke:#1e40af,stroke-width:3px,color:#fff\n    style U1 fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff\n    style U2 fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff\n```"
        
        # בניית הגרף
        mermaid_code = "```mermaid\ngraph TD\n"
        mermaid_code += "    PIKUD[\"🎖️ פיקוד מרכז\"]\n"
        
        # קבוצות לפי אוגדה
        ugdot = {}
        for h in hierarchy_data:
            parent = h['parent_unit']
            child = h['child_unit']
            if parent not in ugdot:
                ugdot[parent] = []
            ugdot[parent].append(child)
        
        # הוספת אוגדות
        ugda_ids = {}
        for idx, ugda in enumerate(ugdot.keys(), 1):
            ugda_id = f"U{idx}"
            ugda_ids[ugda] = ugda_id
            mermaid_code += f"    {ugda_id}[\"⭐ {ugda}\"]\n"
            mermaid_code += f"    PIKUD --> {ugda_id}\n"
        
        # הוספת חטמ"רים
        for ugda, hatmarim in ugdot.items():
            ugda_id = ugda_ids[ugda]
            for idx, hatmar in enumerate(hatmarim, 1):
                hatmar_id = f"{ugda_id}_H{idx}"
                mermaid_code += f"    {hatmar_id}[\"🏛️ {hatmar}\"]\n"
                mermaid_code += f"    {ugda_id} --> {hatmar_id}\n"
        
        # עיצוב
        mermaid_code += "\n    style PIKUD fill:#1e3a8a,stroke:#1e40af,stroke-width:4px,color:#fff,font-size:16px\n"
        for ugda_id in ugda_ids.values():
            mermaid_code += f"    style {ugda_id} fill:#3b82f6,stroke:#2563eb,stroke-width:3px,color:#fff,font-size:14px\n"
        
        mermaid_code += "```"
        return mermaid_code
    except:
        return """```mermaid
graph TD
    C["⚠️ טרם הוגדרה היררכיה"]
    style C fill:#3b82f6,color:#fff
```"""

# --- 6. CSS (עיצוב רספונסיבי מושלם למובייל ומחשב) ---
st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap');
    
    html, body, .stApp {{ 
        direction: rtl; 
        text-align: right; 
        font-family: 'Rubik', sans-serif !important; 
        background: linear-gradient(135deg, {COLORS['bg']} 0%, #e0e7ff 100%);
        color: {COLORS['dark']}; 
    }}
    
    /* כרטיס יחידה - רספונסיבי */
    .login-card {{
        background: white; 
        border-radius: 16px; 
        padding: 20px; 
        text-align: center; 
        border-top: 5px solid {COLORS['primary']};
        box-shadow: 0 8px 16px rgba(0,0,0,0.08); 
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        cursor: pointer; 
        min-height: 180px;
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center;
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
    }}
    
    .login-card::before {{
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        background: linear-gradient(90deg, {COLORS['primary']}, {COLORS['secondary']});
        transform: scaleX(0);
        transition: transform 0.3s ease;
    }}
    
    .login-card:hover {{
        transform: translateY(-8px) scale(1.02); 
        box-shadow: 0 20px 40px rgba(30, 58, 138, 0.15); 
        border-color: {COLORS['secondary']}; 
    }}
    
    .login-card:hover::before {{
        transform: scaleX(1);
    }}
    
    .login-card img {{
        max-height: 90px !important;
        max-width: 100% !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain;
        margin-bottom: 12px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        transition: transform 0.3s ease;
    }}
    
    .login-card:hover img {{
        transform: scale(1.1);
    }}
    
    .login-card h3 {{
        font-size: 1.1rem;
        margin: 8px 0 0 0;
        font-weight: 700;
        color: {COLORS['primary']};
        line-height: 1.4;
    }}
    
    /* כפתורים משופרים */
    div.stButton > button {{ 
        width: 100%; 
        border-radius: 12px; 
        font-weight: 700; 
        border: none; 
        padding: 0.75rem 1.5rem; 
        box-shadow: 0 4px 12px rgba(30, 58, 138, 0.2); 
        transition: all 0.3s ease;
        background: linear-gradient(135deg, {COLORS['primary']}, {COLORS['secondary']});
        color: white;
        font-size: 1rem;
    }}
    
    div.stButton > button:hover {{
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(30, 58, 138, 0.3);
    }}
    
    /* כותרות */
    h1, h2, h3 {{ 
        color: {COLORS['primary']}; 
        font-weight: 800; 
        text-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }}
    
    h1 {{
        font-size: clamp(1.8rem, 5vw, 3rem);
        margin-bottom: 0.5rem;
    }}
    
    /* כרטיסי סטטוס יחידות */
    .unit-status-card {{
        background: white;
        padding: 15px;
        border-radius: 12px;
        border-top: 4px solid {COLORS['primary']};
        text-align: center;
        margin-bottom: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        transition: all 0.3s ease;
    }}
    
    .unit-status-card:hover {{
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    }}
    
    .unit-status-card img {{
        max-height: 50px;
        margin-bottom: 8px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }}
    
    /* רספונסיביות למובייל */
    @media (max-width: 768px) {{
        .login-card {{
            min-height: 160px;
            padding: 15px;
            margin-bottom: 15px;
        }}
        
        .login-card img {{
            max-height: 70px !important;
        }}
        
        .login-card h3 {{
            font-size: 0.95rem;
        }}
        
        h1 {{
            font-size: 1.8rem !important;
        }}
        
        div.stButton > button {{
            padding: 0.6rem 1rem;
            font-size: 0.95rem;
        }}
        
        .unit-status-card {{
            padding: 12px;
        }}
        
        .unit-status-card img {{
            max-height: 40px;
        }}
    }}
    
    /* אנימציות */
    @keyframes fadeIn {{
        from {{ opacity: 0; transform: translateY(20px); }}
        to {{ opacity: 1; transform: translateY(0); }}
    }}
    
    .login-card {{
        animation: fadeIn 0.5s ease-out;
    }}
    
    /* שיפור טפסים */
    .stTextInput > div > div > input,
    .stSelectbox > div > div > select {{
        border-radius: 8px;
        border: 2px solid #e2e8f0;
        transition: all 0.3s ease;
    }}
    
    .stTextInput > div > div > input:focus,
    .stSelectbox > div > div > select:focus {{
        border-color: {COLORS['primary']};
        box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
    }}
    
    /* Expander משופר */
    .streamlit-expanderHeader {{
        background: white;
        border-radius: 12px;
        border-left: 4px solid {COLORS['warning']};
        font-weight: 700;
    }}
</style>
""", unsafe_allow_html=True)

# --- 7. State ---
if "logged_in" not in st.session_state: st.session_state.logged_in = False
if "role" not in st.session_state: st.session_state.role = "hatmar"
if "selected_unit" not in st.session_state: st.session_state.selected_unit = None
if "login_stage" not in st.session_state: st.session_state.login_stage = "gallery"

# --- 8. Login Screens (עיצוב מושלם) ---

def render_unit_card(unit_name):
    """פונקציית עזר לציור כרטיס יפה"""
    logo = get_logo_url(unit_name)
    st.markdown(f"""
    <div class="login-card">
        <img src="{logo}" alt="{unit_name}">
        <h3>{unit_name}</h3>
    </div>
    """, unsafe_allow_html=True)
    if st.button(f"כניסה", key=f"btn_{unit_name}", use_container_width=True):
        st.session_state.selected_unit = unit_name
        st.session_state.login_stage = "password"
        st.rerun()

def render_login_gallery():
    st.markdown("<h1 style='text-align: center; margin-bottom: 10px;'>🛡️ מערכת שליטה ובקרה פיקודית</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: gray; margin-bottom: 40px; font-size: 1.1rem;'>בחר יחידה לכניסה מאובטחת</p>", unsafe_allow_html=True)
    
    st.markdown("### 🏔️ חטיבות מרחביות")
    
    # גריד רספונסיבי
    cols = st.columns([1, 1, 1, 1])
    for i, unit in enumerate(HATMAR_UNITS):
        with cols[i % 4]:
            render_unit_card(unit)
            
    st.markdown("---")
    st.markdown("### 🎖️ מפקדות ושליטה")
    
    c_cols = st.columns(3)
    for i, cmd in enumerate(COMMAND_UNITS):
        with c_cols[i]:
            render_unit_card(cmd)

def render_login_password():
    unit = st.session_state.selected_unit
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        st.markdown(f"""
        <div style='text-align:center; margin-bottom:20px; padding: 30px; background: white; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);'>
            <img src='{get_logo_url(unit)}' style='max-height: 120px; object-fit: contain; margin-bottom: 15px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));'>
            <h2 style='margin: 0; color: {COLORS['primary']};'>כניסה ל{unit}</h2>
        </div>
        """, unsafe_allow_html=True)
        
        password = st.text_input("🔐 הזן סיסמה (0000 לכניסה ראשונית)", type="password", key="pwd_input")
        
        col_login, col_back = st.columns([2, 1])
        with col_login:
            if st.button("🚀 התחבר", type="primary", use_container_width=True):
                if verify_password(get_stored_password_hash_dummy(unit), password) or password == "0000":
                    if password == "0000":
                        hashed = hash_password("0000")
                        role = "pikud" if unit == "פיקוד מרכז" else ("ugda" if "אוגדה" in unit else "hatmar")
                        try:
                            supabase.table("unit_passwords").upsert({"unit_name": unit, "password": hashed, "role": role}).execute()
                        except: pass

                    st.session_state.logged_in = True
                    st.session_state.role = get_user_role(unit)
                    st.success("✅ התחברות בוצעה בהצלחה!")
                    time.sleep(0.5)
                    st.rerun()
                else:
                    st.error("❌ סיסמה שגויה")
        
        with col_back:
            if st.button("↩️ חזור", use_container_width=True):
                st.session_state.login_stage = "gallery"
                st.rerun()

def get_stored_password_hash_dummy(unit):
    """פונקציית עזר קטנה למניעת קריסה אם אין יוזר ב-DB"""
    try:
        res = supabase.table("unit_passwords").select("password").eq("unit_name", unit).execute()
        if res.data: return res.data[0]['password']
    except: pass
    return "INVALID"

# --- 9. Dashboards ---
def render_command_dashboard():
    role = st.session_state.role
    unit = st.session_state.selected_unit
    accessible_units = get_accessible_units(unit, role)
    raw_data = load_reports_cached(accessible_units)
    df = pd.DataFrame(raw_data)
    
    st.markdown(f"## 🎯 מרכז בקרה פיקודי - {unit}")
    
    # בדיקה אם יש נתונים
    if df.empty:
        st.info("📊 אין נתונים זמינים כרגע. התחל בדיווח ראשון כדי לראות ניתוחים ותובנות.")
        return
    
    # טאבים לפי תפקיד
    if role == 'pikud':
        tabs = st.tabs(["📊 סקירה כללית", "🏆 ליגת יחידות", "🤖 תובנות AI", "📈 ניתוח יחידה", "🗺️ Map", "⚙️ ניהול"])
    else:
        tabs = st.tabs(["📊 סקירה כללית", "🏆 ליגת יחידות", "🤖 תובנות AI", "📈 ניתוח יחידה", "🗺️ Map"])
    
    # ===== טאב 1: סקירה כללית =====
    with tabs[0]:
        st.markdown("### 📊 מדדים מרכזיים")
        
        # כרטיסי מדדים
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("📋 סה״כ דוחות", len(df))
        
        with col2:
            st.metric("🏢 יחידות פעילות", df['unit'].nunique())
        
        with col3:
            mezuzot_missing = int(df['r_mezuzot_missing'].sum()) if 'r_mezuzot_missing' in df.columns else 0
            st.metric("📜 מזוזות חסרות", mezuzot_missing)
        
        with col4:
            eruv_invalid = len(df[df['e_status'] == 'פסול']) if 'e_status' in df.columns else 0
            st.metric("🚧 עירובין פסולים", eruv_invalid, delta=None if eruv_invalid == 0 else f"-{eruv_invalid}", delta_color="inverse")
        
        st.markdown("---")
        
        # מדדי בקרה חשובים
        st.markdown("### 📋 מדדי בקרה מרכזיים")
        
        metric_cols = st.columns(4)
        
        with metric_cols[0]:
            # אחוז כשרות תקין
            if 'k_cert' in df.columns:
                kosher_ok = len(df[df['k_cert'] == 'כן']) / len(df) * 100 if len(df) > 0 else 0
                st.metric("✅ כשרות תקינה", f"{kosher_ok:.0f}%", 
                         delta=f"+{kosher_ok-85:.0f}%" if kosher_ok > 85 else f"{kosher_ok-85:.0f}%",
                         delta_color="normal" if kosher_ok > 85 else "inverse")
        
        with metric_cols[1]:
            # אחוז עירובין תקינים
            if 'e_status' in df.columns:
                eruv_ok = len(df[df['e_status'] == 'תקין']) / len(df) * 100 if len(df) > 0 else 0
                st.metric("🔵 עירובין תקינים", f"{eruv_ok:.0f}%",
                         delta=f"+{eruv_ok-90:.0f}%" if eruv_ok > 90 else f"{eruv_ok-90:.0f}%",
                         delta_color="normal" if eruv_ok > 90 else "inverse")
        
        with metric_cols[2]:
            # ממוצע ניקיון
            if 's_clean' in df.columns:
                clean_avg = df['s_clean'].apply(lambda x: {'מצוין': 5, 'טוב': 4, 'בינוני': 3, 'גרוע': 2}.get(x, 0)).mean()
                st.metric("🧹 ממוצע ניקיון", f"{clean_avg:.1f}/5",
                         delta=f"+{clean_avg-4:.1f}" if clean_avg > 4 else f"{clean_avg-4:.1f}",
                         delta_color="normal" if clean_avg > 4 else "inverse")
        
        with metric_cols[3]:
            # מגמת דיווחים
            if 'date' in df.columns and len(df) > 1:
                df_sorted = df.sort_values('date')
                recent_reports = len(df_sorted.tail(7))
                prev_reports = len(df_sorted.iloc[-14:-7]) if len(df_sorted) >= 14 else 0
                trend = recent_reports - prev_reports
                st.metric("📈 דיווחים (7 ימים)", recent_reports,
                         delta=f"+{trend}" if trend > 0 else f"{trend}" if trend < 0 else "ללא שינוי",
                         delta_color="normal" if trend >= 0 else "inverse")
        
        st.markdown("---")

        
        # גרפים
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### 📊 דוחות לפי יחידה")
            unit_counts = df['unit'].value_counts().reset_index()
            unit_counts.columns = ['unit', 'count']
            fig = px.bar(
                unit_counts, 
                x='unit', 
                y='count', 
                color='count',
                color_continuous_scale='Blues',
                labels={'unit': 'יחידה', 'count': 'מספר דוחות'}
            )
            fig.update_layout(showlegend=False, height=350, xaxis_tickangle=-45)
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.markdown("#### 🚧 סטטוס עירובין")
            if 'e_status' in df.columns:
                eruv_counts = df['e_status'].value_counts()
                colors_map = {'תקין': '#10b981', 'בטיפול': '#f59e0b', 'פסול': '#ef4444'}
                fig = go.Figure(data=[go.Pie(
                    labels=eruv_counts.index, 
                    values=eruv_counts.values, 
                    hole=0.4,
                    marker=dict(colors=[colors_map.get(x, '#64748b') for x in eruv_counts.index])
                )])
                fig.update_layout(height=350)
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("אין נתוני עירוב זמינים")
        
        # גריד יחידות
        if role in ['pikud', 'ugda']:
            st.markdown("---")
            st.markdown("### 🎯 תמונת מצב יחידות")
            sub_units = [u for u in accessible_units if u != unit]
            
            if sub_units:
                cols = st.columns(min(4, len(sub_units)))
                for i, u_name in enumerate(sub_units):
                    with cols[i % len(cols)]:
                        u_df = df[df['unit'] == u_name]
                        score = int(calculate_unit_score(u_df)) if not u_df.empty else 0
                        reports_count = len(u_df)
                        badge, badge_color = get_unit_badge(score)
                        
                        st.markdown(f"""
                        <div class="unit-status-card" style="border-top-color: {badge_color};">
                            <img src="{get_logo_url(u_name)}">
                            <div style="font-weight:700; font-size:0.95rem; margin-bottom: 5px;">{u_name}</div>
                            <div style="font-size:0.85rem; color:gray;">ציון: <span style="color:{badge_color}; font-weight:700; font-size: 1.1rem;">{score}</span></div>
                            <div style="font-size:0.75rem; color:#888;">דוחות: {reports_count}</div>
                            <div style="font-size:0.7rem; margin-top:5px; padding:4px 8px; background:{badge_color}; color:white; border-radius:6px;">{badge}</div>
                        </div>
                        """, unsafe_allow_html=True)
    
    # ===== טאב 2: ליגת יחידות =====
    with tabs[1]:
        st.markdown("### 🏆 ליגת חטמ״רים - דירוג ביצועים")
        
        league = []
        for u in df['unit'].unique():
            unit_df = df[df['unit'] == u]
            if len(unit_df) > 0:
                score = calculate_unit_score(unit_df)
                badge, color = get_unit_badge(score)
                league.append({
                    "יחידה": u,
                    "ציון": score,
                    "דוחות": len(unit_df),
                    "תג": badge,
                    "צבע": color
                })
        
        league_df = pd.DataFrame(league).sort_values("ציון", ascending=False).reset_index(drop=True)
        
        for idx, row in league_df.iterrows():
            rank = idx + 1
            medal = "🥇" if rank == 1 else "🥈" if rank == 2 else "🥉" if rank == 3 else f"{rank}."
            
            st.markdown(f"""
                <div style='background: white; border-radius: 14px; padding: 18px; margin-bottom: 12px;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.08); display: flex; 
                            justify-content: space-between; align-items: center; border-right: 5px solid {row['צבע']};'>
                    <div style='display: flex; gap: 15px; align-items: center;'>
                        <span style='font-size: 1.8rem; font-weight: 800; min-width: 50px;'>{medal}</span>
                        <span style='font-size: 1.2rem; font-weight: 700;'>{row['יחידה']}</span>
                    </div>
                    <div style='display: flex; gap: 20px; align-items: center;'>
                        <div style='text-align: center;'>
                            <div style='font-size: 0.85rem; color: #64748b;'>ציון</div>
                            <div style='font-size: 1.8rem; font-weight: 800; color: {row['צבע']};'>
                                {row['ציון']:.0f}
                            </div>
                        </div>
                        <div style='text-align: center;'>
                            <div style='font-size: 0.85rem; color: #64748b;'>דוחות</div>
                            <div style='font-size: 1.2rem; font-weight: 600;'>
                                {row['דוחות']}
                            </div>
                        </div>
                        <div style='background: {row['צבע']}; color: white;
                                    padding: 8px 16px; border-radius: 8px; font-weight: 600; min-width: 120px; text-align: center;'>
                            {row['תג']}
                        </div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        
        # גרף השוואתי
        st.markdown("---")
        st.markdown("### 📊 השוואת ציונים")
        fig = px.bar(
            league_df, 
            x='יחידה', 
            y='ציון',
            color='ציון',
            color_continuous_scale=['#ef4444', '#f59e0b', '#10b981'],
            range_color=[0, 100],
            labels={'ציון': 'ציון (0-100)'}
        )
        fig.update_layout(height=400, xaxis_tickangle=-45)
        st.plotly_chart(fig, use_container_width=True)
    
    # ===== טאב 3: תובנות AI =====
    with tabs[2]:
        st.markdown("### 🤖 ניתוח חכם")
        
        # סיכום AI
        summary = generate_ai_summary(df)
        st.info(summary["overview"])
        
        st.markdown("---")
        st.markdown("### 🚨 התראות והמלצות")
        
        # התראות מפקדים
        alerts = generate_commander_alerts(df)
        if alerts:
            for alert in alerts:
                st.warning(f"{alert['icon']} **{alert['title']}**: {alert['message']}")
        else:
            st.success("✅ אין התראות קריטיות - המצב תקין!")
        
        # ניתוח מגמות
        st.markdown("---")
        st.markdown("### 📈 מגמות ותחזיות")
        
        if 'date' in df.columns:
            df_copy = df.copy()
            if not pd.api.types.is_datetime64_any_dtype(df_copy['date']):
                df_copy['date'] = pd.to_datetime(df_copy['date'], errors='coerce')
            
            # דוחות לאורך זמן
            reports_over_time = df_copy.groupby(df_copy['date'].dt.to_period('W')).size().reset_index()
            reports_over_time.columns = ['week', 'count']
            reports_over_time['week'] = reports_over_time['week'].astype(str)
            
            fig = px.line(
                reports_over_time, 
                x='week', 
                y='count',
                markers=True,
                labels={'week': 'שבוע', 'count': 'מספר דוחות'},
                title='מגמת דיווחים שבועית'
            )
            fig.update_layout(height=300)
            st.plotly_chart(fig, use_container_width=True)
    
    # ===== טאב 4: ניתוח יחידה =====
    with tabs[3]:
        st.markdown("### 📈 ניתוח מעמיק ליחידה")
        
        selected_unit = st.selectbox("בחר יחידה לניתוח", sorted(df['unit'].unique()))
        unit_df = df[df['unit'] == selected_unit]
        
        if len(unit_df) > 0:
            # ציון ותג
            score = calculate_unit_score(unit_df)
            badge, color = get_unit_badge(score)
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("ציון כללי", f"{score:.1f}/100")
            with col2:
                st.metric("סה״כ דוחות", len(unit_df))
            with col3:
                st.markdown(f"<div style='background:{color}; color:white; padding:15px; border-radius:10px; text-align:center; font-weight:700; font-size:1.1rem;'>{badge}</div>", unsafe_allow_html=True)
            
            st.markdown("---")
            
            # תובנות
            st.markdown("### 💡 תובנות ומסקנות")
            insights = analyze_unit_trends(unit_df)
            for ins in insights:
                st.info(f"{ins['icon']} **{ins['title']}**: {ins['message']}")
            
            # פירוט נתונים
            st.markdown("---")
            st.markdown("### 📋 פירוט דוחות")
            
            # אפשרות מחיקה למנהלים בלבד
            if role in ['pikud', 'ogda']:
                st.markdown("#### 🗑️ ניהול דוחות (מנהלים בלבד)")
                
                if not unit_df.empty and 'id' in unit_df.columns:
                    # בחירת דוח למחיקה
                    delete_options = []
                    for idx, row in unit_df.iterrows():
                        date_str = row['date'].strftime('%Y-%m-%d') if pd.notna(row['date']) else 'לא ידוע'
                        base = row.get('base', 'לא ידוע')
                        inspector = row.get('inspector', 'לא ידוע')
                        report_id = row.get('id', '')
                        delete_options.append(f"{date_str} | {base} | {inspector} (ID: {report_id})")
                    
                    selected_report = st.selectbox("בחר דוח למחיקה:", ["-- בחר דוח --"] + delete_options)
                    
                    if selected_report != "-- בחר דוח --":
                        # חילוץ ID מהבחירה
                        report_id = selected_report.split("ID: ")[1].rstrip(")")
                        
                        col1, col2 = st.columns([1, 4])
                        with col1:
                            if st.button("🗑️ מחק דוח", type="primary"):
                                try:
                                    supabase.table("reports").delete().eq("id", report_id).execute()
                                    st.success("✅ הדוח נמחק בהצלחה!")
                                    clear_cache()
                                    time.sleep(1)
                                    st.rerun()
                                except Exception as e:
                                    st.error(f"❌ שגיאה במחיקה: {e}")
                        with col2:
                            st.warning("⚠️ פעולה זו בלתי הפיכה!")
                
                st.markdown("---")
            
            display_df = unit_df[['date', 'base', 'inspector', 'e_status', 'k_cert']].copy()
            display_df.columns = ['תאריך', 'מוצב', 'מבקר', 'עירוב', 'כשרות']
            st.dataframe(display_df, use_container_width=True)
        else:
            st.info("לא נמצאו דוחות ליחידה זו")
    
    # ===== טאב 5: מפה מבצעית =====
    with tabs[4]:
        st.markdown("### �️ תמונת מצב גזרתית - רבנות פקמ״ז")
        
        # בורר מצבי תצוגה
        map_mode = st.radio("בחר תצוגה:", ["🎯 נקודות חטמ״ר", "🔥 מפת חום", "📊 Clustering"], horizontal=True)
        
        if 'latitude' in df.columns and 'longitude' in df.columns:
            valid = df.dropna(subset=['latitude', 'longitude']).copy()
            
            if not valid.empty:
                # מיפוי צבעים
                unit_color_map = {
                    "חטמ״ר בנימין": "rgb(30,58,138)",
                    "חטמ״ר שומרון": "rgb(96,165,250)",
                    "חטמ״ר יהודה": "rgb(34,197,94)",
                    "חטמ״ר עציון": "rgb(251,146,60)",
                    "חטמ״ר אפרים": "rgb(239,68,68)",
                    "חטמ״ר מנשה": "rgb(168,85,247)",
                    "חטמ״ר הבקעה": "rgb(219,39,119)"
                }
                
                if map_mode == "🎯 נקודות חטמ״ר":
                    # מפת נקודות צבעונית
                    # גודל נקודה לפי בעיות (פסול/לא כשר = גדול יותר)
                    valid['size_val'] = valid.apply(
                        lambda r: 15 if (r.get('e_status') == 'פסול' or r.get('k_cert') == 'לא') else 8, 
                        axis=1
                    )
                    
                    fig = px.scatter_mapbox(
                        valid,
                        lat="latitude",
                        lon="longitude",
                        hover_name="base",
                        hover_data={
                            "unit": True, 
                            "e_status": True, 
                            "k_cert": True,
                            "latitude": False, 
                            "longitude": False,
                            "size_val": False
                        },
                        color="unit",
                        size="size_val",
                        color_discrete_map=unit_color_map,
                        zoom=8,
                        height=600
                    )
                    
                    fig.update_layout(
                        mapbox_style="carto-positron",
                        margin={"r": 0, "t": 0, "l": 0, "b": 0}
                    )
                    
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # מקרא
                    st.markdown("#### 🔑 מקרא חטמ״רים")
                    legend_html = "<div style='display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;'>"
                    units_in_map = valid['unit'].unique()
                    for unit in sorted(units_in_map):
                        color = unit_color_map.get(unit, "rgb(100, 100, 100)")
                        legend_html += f"<div><span style='color: {color}; font-size: 1.2rem;'>●</span> {unit}</div>"
                    legend_html += "</div>"
                    st.markdown(legend_html, unsafe_allow_html=True)
                    
                    # הסבר גדלים
                    st.info("💡 **נקודות גדולות** = בעיות (עירוב פסול או כשרות לא תקינה)")
                
                elif map_mode == "🔥 מפת חום":
                    # מפת חום - צפיפות דיווחים
                    fig = px.density_mapbox(
                        valid,
                        lat="latitude",
                        lon="longitude",
                        hover_name="base",
                        hover_data={"unit": True, "latitude": False, "longitude": False},
                        radius=15,
                        zoom=8,
                        height=600,
                        color_continuous_scale="YlOrRd"
                    )
                    
                    fig.update_layout(
                        mapbox_style="carto-positron",
                        margin={"r": 0, "t": 0, "l": 0, "b": 0}
                    )
                    
                    st.plotly_chart(fig, use_container_width=True)
                    st.info("🔥 **אזורים חמים** = ריכוז גבוה של דיווחים")
                
                else:
                    # מצב Clustering
                    st.markdown("#### 📊 ניתוח Clustering - קיבוץ דיווחים")
                    
                    # חישוב clusters
                    clustered = calculate_clusters(valid, radius_km=2.0)
                    cluster_stats = get_cluster_stats(clustered)
                    
                    # הצגת סטטיסטיקות
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("📍 אזורי פעילות", len(cluster_stats))
                    with col2:
                        avg_per_cluster = sum(c['count'] for c in cluster_stats) / len(cluster_stats) if cluster_stats else 0
                        st.metric("📊 ממוצע דיווחים לאזור", f"{avg_per_cluster:.1f}")
                    with col3:
                        max_cluster = max(cluster_stats, key=lambda x: x['count']) if cluster_stats else None
                        if max_cluster:
                            st.metric("🔥 אזור עם הכי הרבה דיווחים", max_cluster['count'])
                    
                    # מפה עם clusters
                    if cluster_stats:
                        cluster_df = pd.DataFrame(cluster_stats)
                        
                        fig = px.scatter_mapbox(
                            cluster_df,
                            lat="center_lat",
                            lon="center_lon",
                            size="count",
                            hover_name="base",
                            hover_data={"unit": True, "count": True, "center_lat": False, "center_lon": False},
                            color="count",
                            color_continuous_scale="Viridis",
                            zoom=8,
                            height=600,
                            size_max=30
                        )
                        
                        fig.update_layout(
                            mapbox_style="carto-positron",
                            margin={"r": 0, "t": 0, "l": 0, "b": 0}
                        )
                        
                        st.plotly_chart(fig, use_container_width=True)
                        
                        # טבלת clusters
                        st.markdown("**פירוט אזורי פעילות:**")
                        cluster_table = cluster_df[['base', 'unit', 'count']].sort_values('count', ascending=False)
                        cluster_table.columns = ['מוצב', 'חטמ"ר', 'דיווחים']
                        st.dataframe(cluster_table, use_container_width=True, hide_index=True)
                    
                    st.info("💡 **גודל בועה** = מספר דיווחים באזור (רדיוס 2 ק\"מ)")
            else:
                st.info("אין נתוני מיקום זמינים 📍")
        else:
            st.info("📍 אין נתוני מיקום זמינים")
    
    # ===== טאב 6: ניהול (רק פיקוד) =====
    if role == 'pikud':
        with tabs[5]:
            management_tabs = st.tabs(["🔗 ניהול היררכיה", "🔑 ניהול סיסמאות", "🖼️ ניהול לוגואים"])
            
            # ניהול היררכיה
            with management_tabs[0]:
                st.subheader("🔗 שיוך חטמ״רים לאוגדות")
                
                # הצגת שיוכים קיימים
                try:
                    current_hierarchy = supabase.table("hierarchy").select("*").execute().data
                    if current_hierarchy:
                        st.markdown("**שיוכים נוכחיים:**")
                        for h in current_hierarchy:
                            col1, col2 = st.columns([3, 1])
                            with col1:
                                st.info(f"📌 {h['child_unit']} ← {h['parent_unit']}")
                            with col2:
                                if st.button("🗑️ הסר", key=f"del_{h['child_unit']}"):
                                    try:
                                        supabase.table("hierarchy").delete().eq("child_unit", h['child_unit']).execute()
                                        st.success("✅ השיוך הוסר")
                                        time.sleep(0.5)
                                        st.rerun()
                                    except:
                                        st.error("❌ שגיאה בהסרת השיוך")
                except Exception as e:
                    st.warning(f"טבלת היררכיה טרם נוצרה. היא תיווצר אוטומטית בשיוך הראשון.")
                
                st.markdown("---")
                
                # טופס שיוך חדש
                with st.form("assign_hierarchy"):
                    col1, col2 = st.columns(2)
                    with col1:
                        parent = st.selectbox("אוגדה (Parent)", [u for u in COMMAND_UNITS if u != "פיקוד מרכז"])
                    with col2:
                        child = st.selectbox("חטמ״ר (Child)", HATMAR_UNITS)
                    
                    if st.form_submit_button("✅ בצע שיוך", use_container_width=True):
                        try:
                            supabase.table("hierarchy").delete().eq("child_unit", child).execute()
                            supabase.table("hierarchy").insert({"parent_unit": parent, "child_unit": child}).execute()
                            st.success(f"✅ {child} שוייך בהצלחה ל-{parent}")
                            clear_cache()
                            time.sleep(1)
                            st.rerun()
                        except Exception as e:
                            error_msg = str(e)
                            st.error(f"❌ שגיאה: {error_msg}")
                            if "PGRST205" in error_msg or "hierarchy" in error_msg:
                                st.info("💡 **פתרון:** יש ליצור טבלה בשם `hierarchy` ב-Supabase עם העמודות:\n- `parent_unit` (text)\n- `child_unit` (text)")
            
            # ניהול סיסמאות
            with management_tabs[1]:
                st.subheader("🔑 עדכון סיסמאות יחידות")
                
                col1, col2 = st.columns(2)
                with col1:
                    selected_unit_pwd = st.selectbox("בחר יחידה", ALL_UNITS, key="pwd_unit")
                with col2:
                    new_pwd = st.text_input("סיסמה חדשה", type="password", key="new_pwd")
                
                if st.button("🔄 עדכן סיסמה", use_container_width=True):
                    if new_pwd and len(new_pwd) >= 4:
                        if update_unit_password(selected_unit_pwd, new_pwd):
                            st.success(f"✅ הסיסמה עודכנה בהצלחה עבור {selected_unit_pwd}")
                        else:
                            st.error("❌ שגיאה בעדכון הסיסמה")
                    else:
                        st.warning("⚠️ הסיסמה חייבת להכיל לפחות 4 תווים")
            
            # ניהול לוגואים
            with management_tabs[2]:
                st.subheader("🖼️ העלאת לוגואים")
                
                selected_logo_unit = st.selectbox("בחר יחידה", ALL_UNITS, key="logo_unit")
                
                col_preview, col_upload = st.columns(2)
                with col_preview:
                    st.markdown("**לוגו נוכחי:**")
                    st.image(get_logo_url(selected_logo_unit), width=150)
                
                with col_upload:
                    st.markdown("**העלאת לוגו חדש:**")
                    uploaded_logo = st.file_uploader("בחר קובץ תמונה", type=['png', 'jpg', 'jpeg'], key="logo_file")
                    
                    if uploaded_logo and st.button("📤 העלה לוגו", use_container_width=True):
                        if upload_logo_to_supabase(selected_logo_unit, uploaded_logo.getvalue()):
                            st.success(f"✅ הלוגו עודכן בהצלחה עבור {selected_logo_unit}")
                            time.sleep(1)
                            st.rerun()
                        else:
                            st.error("❌ שגיאה בהעלאת הלוגו")

def render_unit_report():
    """הטופס המלא"""
    unit = st.session_state.selected_unit
    c1, c2 = st.columns([1, 6])
    with c1: st.image(get_logo_url(unit), width=80)
    with c2: st.title(f"📋 דיווח ביקורת - {unit}")
    
    with st.form("report"):
        st.markdown("### 📍 מיקום ותאריך")
        loc = streamlit_geolocation()
        gps_lat, gps_lon = (loc['latitude'], loc['longitude']) if loc and loc.get('latitude') else (None, None)
        
        if gps_lat:
            st.success(f"✅ מיקום נקלט: {gps_lat:.4f}, {gps_lon:.4f}")
            
            # בדיקת מרחק מבסיסים ידועים
            nearest_base, distance = find_nearest_base(gps_lat, gps_lon)
            
            if distance < 2.0:
                st.info(f"📍 **מיקום מזוהה:** {nearest_base} ({distance:.1f} ק\"מ)")
            elif distance < 5.0:
                st.warning(f"⚠️ **מרחק בינוני:** {nearest_base} ({distance:.1f} ק\"מ) - וודא שהמיקום נכון")
            else:
                st.error(f"🚨 **התראה:** {distance:.1f} ק\"מ מ-{nearest_base} - מיקום חריג!")
        
        c1, c2, c3 = st.columns(3)
        date = c1.date_input("תאריך", datetime.date.today())
        time_v = c2.time_input("שעה", datetime.datetime.now().time())
        inspector = c3.text_input("מבקר *")
        base = st.text_input("מוצב / מיקום *", placeholder="לדוגמה: מחנה עופר, בית אל, וכו'")
        
        st.markdown("### 🏠 פילבוקס / הגנ״ש")
        c1, c2 = st.columns(2)
        p_pakal = c1.radio("האם יש פק״ל רבנות?", ["כן", "לא"], horizontal=True, key="p1")
        p_marked = c2.radio("האם הכלים מסומנים?", ["כן", "לא"], horizontal=True, key="p2")
        c1, c2 = st.columns(2)
        p_mix = c1.radio("האם זוהה ערבוב כלים?", ["כן", "לא"], horizontal=True, key="p3")
        p_kasher = c2.radio("האם נדרשת הכשרה כלים?", ["כן", "לא"], horizontal=True, key="p4")
        
        st.markdown("### 📜 נהלים")
        c1, c2 = st.columns(2)
        r_sg = c1.radio("האם יש הוראות רבנות בש.ג?", ["כן", "לא"], horizontal=True, key="r1")
        r_hamal = c2.radio("האם יש הוראות רבנות בחמ״ל?", ["כן", "לא"], horizontal=True, key="r2")
        c1, c2 = st.columns(2)
        r_sign = c1.radio("האם יש שילוט על מתקנים שיש בהם חילול שבת (כגון תמי 4)?", ["כן", "לא"], horizontal=True, key="r3")
        r_netilot = c2.radio("האם קיימות נטלות?", ["כן", "לא"], horizontal=True, key="r4")
        c1, c2 = st.columns(2)
        r_mezuzot_missing = c1.number_input("כמה מזוזות חסרות?", 0)
        r_shabbat_device = c2.radio("האם קיימים התקני שבת?", ["כן", "לא", "חלקי"], horizontal=True, key="r5")
        
        st.markdown("### 🕍 בית כנסת")
        c1, c2 = st.columns(2)
        s_board = c1.radio("האם לוח רבנות מעודכן?", ["כן", "לא"], horizontal=True, key="s1")
        s_clean = c2.radio("האם בית הכנסת נקי?", ["כן", "לא"], horizontal=True, key="s7")
        s_books = st.multiselect("ספרי יסוד קיימים:", ["תורת המחנה", "לוח דינים", "הלכה כסדרה", "שו״ת משיב מלחמה"])
        c1, c2 = st.columns(2)
        s_havdala = c1.radio("האם יש ערכת הבדלה והדלקת נרות שבת?", ["כן", "לא"], horizontal=True, key="s3")
        s_gemach = c2.radio("האם יש גמ״ח טלית ותפילין?", ["כן", "לא"], horizontal=True, key="s4")
        c1, c2 = st.columns(2)
        s_smartbis = c1.radio("האם יש תקלת בינוי (אם כן עדכנת בסמארט-ביס)?", ["כן", "לא"], horizontal=True, key="s5")
        s_geniza = c2.radio("האם יש פח גניזה?", ["כן", "לא"], horizontal=True, key="s6")
        
        st.markdown("### 🚧 עירוב")
        c1, c2 = st.columns(2)
        e_status = c1.selectbox("סטטוס עירוב", ["תקין", "פסול", "בטיפול"])
        e_check = c2.radio("האם בוצעה בדיקה?", ["כן", "לא"], horizontal=True, key="e1")
        c1, c2 = st.columns(2)
        e_doc = c1.radio("האם בוצע תיעוד?", ["כן", "לא"], horizontal=True, key="e2")
        e_photo = c2.radio("האם קיימת תצ״א?", ["כן", "לא"], horizontal=True, key="e3")
        
        st.markdown("### 🍽️ מטבח")
        k_cook_type = st.selectbox("סוג מטבח", ["מבשל", "מחמם"])
        c1, c2 = st.columns(2)
        k_cert = c1.radio("תעודת כשרות מתוקפת?", ["כן", "לא"], horizontal=True, key="k7")
        k_bishul = c2.radio("האם יש בישול ישראל?", ["כן", "לא"], horizontal=True, key="k8")
        c1, c2 = st.columns(2)
        k_separation = c1.radio("האם יש הפרדה?", ["כן", "לא"], horizontal=True, key="k1")
        k_briefing = c2.radio("האם בוצע תדריך טבחים?", ["כן", "לא"], horizontal=True, key="k2")
        c1, c2 = st.columns(2)
        k_products = c1.radio("האם רכש חוץ מתנהל לפי פקודה?", ["כן", "לא"], horizontal=True, key="k3")
        k_dates = c2.radio("האם יש דף תאריכים לתבלינים?", ["כן", "לא"], horizontal=True, key="k4")
        c1, c2 = st.columns(2)
        k_leafs = c1.radio("האם יש שטיפת ירק?", ["כן", "לא"], horizontal=True, key="k5")
        k_holes = c2.radio("בוצע חירור גסטרונומים?", ["כן", "לא"], horizontal=True, key="k6")
        c1, c2 = st.columns(2)
        k_eggs = c1.radio("האם מבוצעת בדיקת ביצים?", ["כן", "לא"], horizontal=True, key="k9")
        k_machshir = c2.radio("האם יש חדר מכ״ש במפג״ד?", ["כן", "לא"], horizontal=True, key="k10")
        c1, c2 = st.columns(2)
        k_heater = c1.radio("האם יש חימום נפרד בין בשר ודגים?", ["כן", "לא"], horizontal=True, key="k11")
        k_app = c2.radio("האם מולאה אפליקציה?", ["כן", "לא"], horizontal=True, key="k12")
        
        st.markdown("### ☕ טרקלין")
        c1, c2 = st.columns(2)
        t_private = c1.radio("האם יש כלים פרטיים?", ["כן", "לא"], horizontal=True, key="t1")
        t_kitchen_tools = c2.radio("האם יש כלי מטבח?", ["כן", "לא"], horizontal=True, key="t2")
        c1, c2 = st.columns(2)
        t_procedure = c1.radio("האם נשמר נוהל סגירה?", ["כן", "לא"], horizontal=True, key="t3")
        t_friday = c2.radio("האם הכלים החשמליים סגורים בשבת?", ["כן", "לא"], horizontal=True, key="t4")
        t_app = st.radio("האם מולאה אפליקציה לטרקלין?", ["כן", "לא"], horizontal=True, key="t5")
        
        st.markdown("### 🍳 WeCook ויקווק")
        w_location = st.text_input("מיקום הוויקוק")
        c1, c2 = st.columns(2)
        w_private = c1.radio("האם יש כלים פרטיים בוויקוק?", ["כן", "לא"], horizontal=True, key="w1")
        w_kitchen_tools = c2.radio("האם יש כלי מטבח בוויקוק?", ["כן", "לא"], horizontal=True, key="w2")
        c1, c2 = st.columns(2)
        w_procedure = c1.radio("האם עובד לפי פקודה?", ["כן", "לא"], horizontal=True, key="w3")
        w_guidelines = c2.radio("האם יש הנחיות?", ["כן", "לא"], horizontal=True, key="w4")
        
        st.markdown("### ⚠️ חוסרים")
        missing = st.text_area("פירוט חוסרים")
        
        st.markdown("### 💬 שיחת חתך")
        c1, c2 = st.columns(2)
        soldier_yeshiva = c1.radio("האם יש ימי ישיבה?", ["כן", "לא"], horizontal=True, key="so1")
        soldier_lessons = c2.text_input("שיעורים בגדוד")
        c1, c2 = st.columns(2)
        soldier_food = c1.radio("האם המענה הכשרותי מספק?", ["כן", "לא"], horizontal=True, key="so2")
        soldier_shabbat_training = c2.radio("האם יש אימונים בשבת?", ["כן", "לא"], horizontal=True, key="so3")
        c1, c2 = st.columns(2)
        soldier_knows_rabbi = c1.radio("האם מכיר את הרב?", ["כן", "לא"], horizontal=True, key="so4")
        soldier_prayers = c2.radio("האם יש זמני תפילות?", ["כן", "לא"], horizontal=True, key="so5")
        soldier_talk_cmd = st.radio("האם יש שיח מפקדים?", ["כן", "לא"], horizontal=True, key="so6")
        
        st.markdown("---")
        free_text = st.text_area("הערות נוספות")
        photo = st.file_uploader("📸 תמונה (חובה)", type=['jpg', 'png', 'jpeg'])
        
        # שליחת הדוח
        if st.form_submit_button("🚀 שגר דיווח", type="primary", use_container_width=True):
            # מיקום - יוגדר ידנית אם צריך בעתיד
            gps_lat, gps_lon = None, None
            
            if base and inspector and photo:
                photo_url = upload_report_photo(photo.getvalue(), unit, base)
                data = {
                    "unit": st.session_state.selected_unit, "date": datetime.datetime.now().isoformat(),
                    "base": base, "inspector": inspector, "photo_url": photo_url,
                    "k_cert": k_cert, "k_dates": k_dates, # "k_mashgiach": k_mashgiach, "k_storage": k_storage,
                    # "k_meat_milk": k_meat_milk, "k_shabbat": k_shabbat, "k_kitchen": k_kitchen,
                    "e_status": e_status, # "e_type": e_type, "e_wire_height": e_wire_height, "e_poles": e_poles,
                    # "e_gates": e_gates, "e_signage": e_signage, "e_last_check": e_last_check,
                    # "p_exists": p_exists, "p_type": p_type, "p_updated": p_updated, "p_accessible": p_accessible,
                    "s_clean": s_clean, # "s_equipment": s_equipment, "s_organized": s_organized,
                    # "s_fridge": s_fridge, "s_signage": s_signage, "s_kosher_products": s_kosher_products,
                    # "t_location": t_location,
                    "t_private": t_private, "t_kitchen_tools": t_kitchen_tools, "t_procedure": t_procedure,
                    "t_friday": t_friday, "t_app": t_app, "w_location": w_location, "w_private": w_private,
                    "w_kitchen_tools": w_kitchen_tools, "w_procedure": w_procedure, "w_guidelines": w_guidelines,
                    "soldier_yeshiva": soldier_yeshiva, "soldier_lessons": soldier_lessons, "soldier_food": soldier_food,
                    "soldier_shabbat_training": soldier_shabbat_training, "soldier_knows_rabbi": soldier_knows_rabbi,
                    "soldier_prayers": soldier_prayers, "soldier_talk_cmd": soldier_talk_cmd, "free_text": free_text,
                    "time": str(time_v), "p_pakal": p_pakal, "missing_items": missing,
                    "r_mezuzot_missing": r_mezuzot_missing, "k_cook_type": k_cook_type,
                    "p_marked": p_marked, "p_mix": p_mix, "p_kasher": p_kasher,
                    "r_sg": r_sg, "r_hamal": r_hamal, "r_sign": r_sign, "r_netilot": r_netilot,
                    "r_shabbat_device": r_shabbat_device, "s_board": s_board, "s_books": str(s_books),
                    "s_havdala": s_havdala, "s_gemach": s_gemach, "s_smartbis": s_smartbis, "s_geniza": s_geniza,
                    "e_check": e_check, "e_doc": e_doc, "e_photo": e_photo,
                    "k_separation": k_separation, "k_briefing": k_briefing, "k_products": k_products,
                    "k_leafs": k_leafs, "k_holes": k_holes, "k_bishul": k_bishul,
                    "k_eggs": k_eggs, "k_machshir": k_machshir, "k_heater": k_heater, "k_app": k_app
                }
                
                # הוספת מיקום רק אם קיים ואם הטבלה תומכת בזה
                if gps_lat and gps_lon:
                    data["latitude"] = gps_lat
                    data["longitude"] = gps_lon
                
                try:
                    supabase.table("reports").insert(data).execute()
                    st.success("✅ הדוח נשלח בהצלחה ונקלט בחמ״ל!")
                    clear_cache()
                    time.sleep(1)
                    st.rerun()
                except Exception as e:
                    error_msg = str(e)
                    # אם השגיאה היא בגלל עמודות שלא קיימות, נסה בלעדיהן
                    if any(col in error_msg for col in ["latitude", "longitude", "photo_url"]):
                        try:
                            # הסרת עמודות שלא קיימות
                            data.pop("latitude", None)
                            data.pop("longitude", None)
                            data.pop("photo_url", None)
                            supabase.table("reports").insert(data).execute()
                            st.success("✅ הדוח נשלח בהצלחה!")
                            clear_cache()
                            time.sleep(2)
                            st.rerun()
                        except Exception as e2:
                            st.error(f"❌ שגיאה בשמירה: {e2}")
                    else:
                        st.error(f"❌ שגיאה בשמירה: {error_msg}")
            else: st.error("⚠️ חסרים פרטי חובה (מוצב, מבקר או תמונה)")
    
    # --- סטטיסטיקות מבקרים ---
    st.markdown("---")
    st.markdown("## 📊 סטטיסטיקות מבקרים")
    
    # טעינת דוחות של היחידה (ללא קאש)
    # ניקוי קאש לפני טעינה כדי להבטיח נתונים עדכניים
    clear_cache()
    unit_reports_raw = supabase.table("reports").select("*").eq("unit", st.session_state.selected_unit).execute().data
    unit_df = pd.DataFrame(unit_reports_raw)
    
    if not unit_df.empty and 'date' in unit_df.columns:
        # המרת תאריכים
        unit_df['date'] = pd.to_datetime(unit_df['date'], errors='coerce')
        
        stats = generate_inspector_stats(unit_df)
        
        if stats:
            # מדדים עיקריים
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("📝 סה\"כ דוחות החודש", stats['total_reports'])
            with col2:
                st.metric("👥 מבקרים פעילים", stats['unique_inspectors'])
            with col3:
                if not stats['top_inspectors'].empty:
                    top_inspector = stats['top_inspectors'].index[0]
                    top_count = stats['top_inspectors'].iloc[0]
                    st.metric("🏆 מבקר מוביל", f"{top_inspector} ({top_count})")
            
            # טאבים לסטטיסטיקות
            stats_tabs = st.tabs(["🏆 טבלת מובילים", "📍 מיקומים", "⏰ שעות פעילות", "📈 התקדמות"])
            
            # טאב 1: טבלת מובילים
            with stats_tabs[0]:
                st.markdown("### 🏆 10 המבקרים המובילים")
                
                if not stats['top_inspectors'].empty:
                    # יצירת טבלה מעוצבת
                    leaderboard_data = []
                    for idx, (inspector, count) in enumerate(stats['top_inspectors'].items(), 1):
                        medal = "🥇" if idx == 1 else "🥈" if idx == 2 else "🥉" if idx == 3 else f"#{idx}"
                        leaderboard_data.append({
                            "מקום": medal,
                            "שם המבקר": inspector,
                            "דוחות": count
                        })
                    
                    leaderboard_df = pd.DataFrame(leaderboard_data)
                    
                    # תצוגה משופרת עם עיצוב ממורכז
                    # שימוש ב-HTML לעיצוב מדליות ממורכזות
                    html_table = "<table style='width:100%; text-align:center; border-collapse: collapse;'>"
                    html_table += "<thead><tr style='background-color: #f0f2f6;'>"
                    html_table += "<th style='padding: 12px; font-size: 16px;'>מקום</th>"
                    html_table += "<th style='padding: 12px; font-size: 16px;'>שם המבקר</th>"
                    html_table += "<th style='padding: 12px; font-size: 16px;'>דוחות</th>"
                    html_table += "</tr></thead><tbody>"
                    
                    for _, row in leaderboard_df.iterrows():
                        html_table += "<tr style='border-bottom: 1px solid #e0e0e0;'>"
                        html_table += f"<td style='padding: 10px; font-size: 24px;'>{row['מקום']}</td>"
                        html_table += f"<td style='padding: 10px; text-align: right; font-size: 16px;'>{row['שם המבקר']}</td>"
                        html_table += f"<td style='padding: 10px; font-size: 16px;'>{row['דוחות']}</td>"
                        html_table += "</tr>"
                    
                    html_table += "</tbody></table>"
                    st.markdown(html_table, unsafe_allow_html=True)
                    
                    # כפתור הורדת Excel
                    excel_data = create_inspector_excel(unit_df)
                    if excel_data:
                        st.download_button(
                            label="📥 הורד דוח Excel",
                            data=excel_data,
                            file_name=f"inspector_stats_{st.session_state.selected_unit}_{pd.Timestamp.now().strftime('%Y%m')}.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            use_container_width=True
                        )
                else:
                    st.info("אין נתונים זמינים")
            
            # טאב 2: מיקומים
            with stats_tabs[1]:
                st.markdown("### 📍 מפת מיקומים")
                
                if not stats['top_locations'].empty and 'base' in unit_df.columns:
                    # מיפוי מוצבים לקואורדינטות (אזור יהודה ושומרון)
                    base_coordinates = {
                        "מוצב בנימין": [31.9, 35.25],
                        "מוצב שומרון": [32.2, 35.2],
                        "מוצב יהודה": [31.7, 35.1],
                        "מוצב עציון": [31.65, 35.12],
                        "מוצב אפרים": [32.1, 35.15],
                        "מוצב מנשה": [32.3, 35.18],
                        "מוצב הבקעה": [31.85, 35.45],
                        # ברירת מחדל לכל מוצב אחר
                    }
                    
                    # צבעים לפי חטמ"ר
                    unit_colors = {
                        "חטמ״ר בנימין": [30, 58, 138, 200],      # כחול כהה
                        "חטמ״ר שומרון": [96, 165, 250, 200],     # כחול שמיים
                        "חטמ״ר יהודה": [34, 197, 94, 200],       # ירוק בהיר
                        "חטמ״ר עציון": [251, 146, 60, 200],      # כתום זהוב
                        "חטמ״ר אפרים": [239, 68, 68, 200],       # אדום
                        "חטמ״ר מנשה": [168, 85, 247, 200],       # סגול
                        "חטמ״ר הבקעה": [219, 39, 119, 200],      # ורוד כהה
                    }
                    
                    # יצירת נתונים למפה
                    map_data = []
                    for base_name, count in stats['top_locations'].items():
                        # קבלת קואורדינטות או שימוש בברירת מחדל
                        coords = base_coordinates.get(base_name, [31.9, 35.2])
                        # הוספת רעש קטן למניעת חפיפה
                        import random
                        lat = coords[0] + random.uniform(-0.02, 0.02)
                        lon = coords[1] + random.uniform(-0.02, 0.02)
                        
                        # מציאת היחידה של המוצב
                        base_reports = unit_df[unit_df['base'] == base_name]
                        unit_name = base_reports['unit'].mode()[0] if not base_reports.empty and 'unit' in base_reports.columns else st.session_state.selected_unit
                        color = unit_colors.get(unit_name, [100, 100, 100, 200])
                        
                        map_data.append({
                            "lat": lat,
                            "lon": lon,
                            "base": base_name,
                            "unit": unit_name,
                            "reports": int(count),
                            "size": count * 100,
                            "color": color
                        })
                    
                    if map_data:
                        map_df = pd.DataFrame(map_data)
                        
                        # המרת צבעים ל-RGB string
                        map_df['color_str'] = map_df['color'].apply(lambda c: f'rgb({c[0]},{c[1]},{c[2]})')
                        
                        # יצירת מפה עם plotly
                        fig = px.scatter_mapbox(
                            map_df,
                            lat="lat",
                            lon="lon",
                            hover_name="base",
                            hover_data={"unit": True, "reports": True, "lat": False, "lon": False, "color_str": False, "size": False},
                            color="unit",
                            size="reports",
                            color_discrete_map={
                                "חטמ״ר בנימין": "rgb(30,58,138)",
                                "חטמ״ר שומרון": "rgb(96,165,250)",
                                "חטמ״ר יהודה": "rgb(34,197,94)",
                                "חטמ״ר עציון": "rgb(251,146,60)",
                                "חטמ״ר אפרים": "rgb(239,68,68)",
                                "חטמ״ר מנשה": "rgb(168,85,247)",
                                "חטמ״ר הבקעה": "rgb(219,39,119)"
                            },
                            zoom=8,
                            height=500
                        )
                        
                        fig.update_layout(
                            mapbox_style="carto-positron",
                            margin={"r": 0, "t": 0, "l": 0, "b": 0}
                        )
                        
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.info("אין נתוני מיקום זמינים")
                else:
                    st.info("אין נתוני מיקום זמינים")
            
            # טאב 3: שעות פעילות
            with stats_tabs[2]:
                st.markdown("### ⏰ שעות פעילות")
                
                if not stats['peak_hours'].empty:
                    # יצירת תרשים עמודות אינטראקטיבי
                    hours_df = pd.DataFrame({
                        'שעה': [f"{int(h):02d}:00" for h in stats['peak_hours'].index],
                        'דוחות': stats['peak_hours'].values
                    })
                    
                    fig = px.bar(
                        hours_df,
                        x='שעה',
                        y='דוחות',
                        title="התפלגות דיווחים לפי שעות",
                        labels={'שעה': 'שעה ביום', 'דוחות': 'מספר דוחות'},
                        color='דוחות',
                        color_continuous_scale='Blues'
                    )
                    
                    fig.update_layout(
                        showlegend=False,
                        height=350,
                        xaxis_tickangle=-45
                    )
                    
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # סיכום שעות שיא
                    top_hour = stats['peak_hours'].index[0]
                    top_count = stats['peak_hours'].iloc[0]
                    st.info(f"🔥 **שעת שיא:** {int(top_hour):02d}:00 עם {int(top_count)} דוחות")
                else:
                    st.info("אין מספיק נתונים להצגת שעות פעילות")
            
            # טאב 4: התקדמות
            with stats_tabs[3]:
                st.markdown("### 📈 גרף התקדמות")
                
                # התקדמות לפי תאריך
                daily_reports = unit_df.groupby(unit_df['date'].dt.date).size().reset_index()
                daily_reports.columns = ['תאריך', 'דוחות']
                
                fig = px.line(
                    daily_reports,
                    x='תאריך',
                    y='דוחות',
                    title="התקדמות דיווחים לאורך זמן",
                    markers=True
                )
                fig.update_layout(height=300)
                st.plotly_chart(fig, use_container_width=True)
                
                # סטטיסטיקה נוספת
                col1, col2 = st.columns(2)
                with col1:
                    avg_daily = daily_reports['דוחות'].mean()
                    st.metric("ממוצע דוחות ליום", f"{avg_daily:.1f}")
                with col2:
                    max_day = daily_reports.loc[daily_reports['דוחות'].idxmax()]
                    st.metric("יום שיא", f"{max_day['תאריך']} ({int(max_day['דוחות'])})")
        else:
            st.info("אין מספיק נתונים להצגת סטטיסטיקות")
    else:
        st.info("טרם הוגשו דוחות ליחידה זו")

# --- 10. Main ---
def main():
    if not st.session_state.logged_in:
        if st.session_state.login_stage == "gallery": render_login_gallery()
        else: render_login_password()
    else:
        with st.sidebar:
            st.image(get_logo_url(st.session_state.selected_unit), width=100)
            st.markdown(f"**{st.session_state.selected_unit}**")
            st.caption(f"תפקיד: {st.session_state.role}")
            if st.button("🚪 יציאה", use_container_width=True):
                st.session_state.logged_in = False
                st.session_state.login_stage = "gallery"
                st.rerun()
        if st.session_state.role in ['pikud', 'ugda']: render_command_dashboard()
        else: render_unit_report()

if __name__ == "__main__":
    main()
