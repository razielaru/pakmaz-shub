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
import random
from streamlit_geolocation import streamlit_geolocation
import math
from typing import Tuple, Optional, List, Dict
import folium
from streamlit_folium import st_folium

# ===== פונקציות עזר למיקום וחישוב מרחקים =====

# קואורדינטות בסיסים ידועים
BASE_COORDINATES = {
    "מחנה עופר": (32.1089, 35.1911),
    "בית אל": (31.9333, 35.2167),
    "פסגות": (31.9667, 35.2000),
    "מחנה שומרון": (32.2167, 35.2833),
    "אריאל": (32.1039, 35.1794),
    "קדומים": (32.1667, 35.2000),
    "גוש עציון": (31.6500, 35.1333),
    "אפרת": (31.6500, 35.1333),
    "בית לחם": (31.7050, 35.2061),
    "מחנה עציון": (31.6500, 35.1333),
    "אלון שבות": (31.6500, 35.1500),
    "מוצב אפרים": (32.0500, 35.3000),
    "מוצב מנשה": (32.3000, 35.1800),
    "מוצב הבקעה": (31.8500, 35.4500),
}

# קודי גישה לרבני חטמ"ר
COMMANDER_CODES = {
    "חטמ״ר בנימין": "binyamin2024",
    "חטמ״ר שומרון": "shomron2024",
    "חטמ״ר יהודה": "yehuda2024",
    "חטמ״ר עציון": "etzion2024",
    "חטמ״ר אפרים": "efraim2024",
    "חטמ״ר מנשה": "menashe2024",
    "חטמ״ר הבקעה": "bika2024"
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """חישוב מרחק בין שתי נקודות על פני כדור הארץ (ק\"מ)"""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return c * 6371

def find_nearest_base(lat: float, lon: float) -> Tuple[str, float]:
    """מציאת הבסיס הקרוב ביותר"""
    min_distance = float('inf')
    nearest_base = "לא ידוע"
    for base_name, (base_lat, base_lon) in BASE_COORDINATES.items():
        distance = haversine_distance(lat, lon, base_lat, base_lon)
        if distance < min_distance:
            min_distance = distance
            nearest_base = base_name
    return nearest_base, min_distance

def calculate_clusters(df: pd.DataFrame, radius_km: float = 2.0) -> pd.DataFrame:
    """קיבוץ דיווחים קרובים"""
    if df.empty or 'latitude' not in df.columns or 'longitude' not in df.columns:
        return df
    df = df.copy()
    df['cluster_id'] = -1
    cluster_id = 0
    for idx, row in df.iterrows():
        if df.loc[idx, 'cluster_id'] != -1:
            continue
        df.loc[idx, 'cluster_id'] = cluster_id
        for idx2, row2 in df.iterrows():
            if idx == idx2 or df.loc[idx2, 'cluster_id'] != -1:
                continue
            distance = haversine_distance(
                row['latitude'], row['longitude'],
                row2['latitude'], row2['longitude']
            )
            if distance <= radius_km:
                df.loc[idx2, 'cluster_id'] = cluster_id
        cluster_id += 1
    return df

def get_cluster_stats(df: pd.DataFrame) -> List[Dict]:
    """חישוב סטטיסטיקות לכל cluster"""
    if 'cluster_id' not in df.columns:
        return []
    stats = []
    for cluster_id in df['cluster_id'].unique():
        if cluster_id == -1:
            continue
        cluster_df = df[df['cluster_id'] == cluster_id]
        center_lat = cluster_df['latitude'].mean()
        center_lon = cluster_df['longitude'].mean()
        most_common_base = cluster_df['base'].mode()[0] if 'base' in cluster_df.columns and not cluster_df['base'].mode().empty else "לא ידוע"
        most_common_unit = cluster_df['unit'].mode()[0] if 'unit' in cluster_df.columns and not cluster_df['unit'].mode().empty else "לא ידוע"
        stats.append({
            'cluster_id': int(cluster_id),
            'count': len(cluster_df),
            'center_lat': center_lat,
            'center_lon': center_lon,
            'base': most_common_base,
            'unit': most_common_unit
        })
    return stats

# ===== פונקציות Folium למפות ברמת רחוב =====

def secure_location_offset(lat: float, lon: float, unique_id: str, offset_meters: int = 300) -> Tuple[float, float]:
    """
    מזיז מיקום בצורה קבועה לפי מזהה ייחודי (ביטחון מידע)
    - אותו unique_id = תמיד אותה הזזה
    - לא ניתן לנחש את המיקום המקורי
    - ההזזה היא 300 מטר בכיוון אקראי (אבל קבוע)
    """
    # ✅ תיקון: השתמש רק ב-unit+base ללא תאריך (כדי שהמיקום יישאר קבוע)
    try:
        stable_id = f"{unique_id.split('_')[0]}_{unique_id.split('_')[1]}" if '_' in unique_id else unique_id
    except:
        stable_id = unique_id
    
    # יצירת seed קבוע מהמזהה
    seed = int(hashlib.sha256(stable_id.encode()).hexdigest(), 16) % (10**8)
    
    # ✅ שמירת המצב הנוכחי של random
    current_random_state = random.getstate()
    
    # יצירת random generator נפרד
    rng = random.Random(seed)
    
    # המרה למעלות (111km = 1 מעלה)
    offset_deg = offset_meters / 111000
    
    # זווית ומרחק אקראיים (אבל קבועים לאותו ID)
    angle = rng.uniform(0, 2 * math.pi)
    dist = rng.uniform(offset_deg * 0.7, offset_deg)
    
    # ✅ שחזור המצב של random
    random.setstate(current_random_state)
    
    # חישוב offset
    lat_offset = dist * math.cos(angle)
    lon_offset = dist * math.sin(angle) / math.cos(math.radians(lat))
    
    return lat + lat_offset, lon + lon_offset

def create_street_level_map(center=(31.9, 35.2), zoom_start=12):
    """יוצר מפה ברמת רחוב עם שכבות מרובות"""
    m = folium.Map(
        location=center,
        zoom_start=zoom_start,
        max_zoom=20,
        control_scale=True,
        tiles=None,
        prefer_canvas=True
    )
    
    # שכבת רחובות עברית (CartoDB Positron - מציג עברית מצוין)
    folium.TileLayer(
        tiles="CartoDB positron",
        name="מפת רחובות",
        max_zoom=20,
        attr="© CartoDB © OpenStreetMap"
    ).add_to(m)
    
    # שכבת לווין Google
    folium.TileLayer(
        tiles="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        name="תצלום לווין",
        attr="© Google",
        max_zoom=20
    ).add_to(m)
    
    # בקרת שכבות
    folium.LayerControl(position='topleft').add_to(m)
    
    return m

def add_unit_marker_to_folium(m, row, unit_colors):
    """מוסיף סימון ליחידה עם offset ביטחוני"""
    # הזזה ביטחונית קבועה (300 מטר)
    lat, lon = secure_location_offset(
        row.get("latitude", 31.9),
        row.get("longitude", 35.2),
        unique_id=f"{row.get('unit', 'unknown')}_{row.get('base', 'unknown')}_{row.get('date', '')}"
    )
    
    # צבע לפי יחידה
    color = unit_colors.get(row.get('unit', ''), '#808080')
    
    # גודל לפי בעיות
    has_issues = (row.get('e_status') == 'פסול' or row.get('k_cert') == 'לא')
    radius = 10 if has_issues else 7
    
    # popup בעברית RTL
    popup_html = f"""
    <div dir="rtl" style="text-align:right; font-family:Arial; font-size:14px; min-width:200px;">
        <b style="color:#1e3a8a; font-size:16px;">📍 {row.get('base', 'לא ידוע')}</b><br><br>
        <b>יחידה:</b> {row.get('unit', 'לא ידוע')}<br>
        <b>מבקר:</b> {row.get('inspector', 'לא ידוע')}<br>
        <b>עירוב:</b> <span style="color:{'#ef4444' if row.get('e_status')=='פסול' else '#10b981'};">{row.get('e_status', 'לא ידוע')}</span><br>
        <b>כשרות:</b> <span style="color:{'#ef4444' if row.get('k_cert')=='לא' else '#10b981'};">{row.get('k_cert', 'לא ידוע')}</span><br>
        <b>תאריך:</b> {row.get('date', 'לא ידוע')}
    </div>
    """
    
    folium.CircleMarker(
        location=[lat, lon],
        radius=radius,
        color=color,
        fill=True,
        fillColor=color,
        fillOpacity=0.7,
        weight=2,
        popup=folium.Popup(popup_html, max_width=300),
        tooltip=f"📍 {row.get('base', 'מוצב')}"
    ).add_to(m)

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
    /* RTL Support - יישור לימין לעברית */
    .main, .block-container, [data-testid="stAppViewContainer"], [data-testid="stApp"] {
        direction: rtl !important;
        text-align: right !important;
    }
    
    /* כותרות - יישור לימין */
    h1, h2, h3, h4, h5, h6 {
        direction: rtl !important;
        text-align: right !important;
    }
    
    /* הסתרת sidebar בכל המכשירים */
    [data-testid="stSidebar"] {
        display: none !important;
    }
    
    /* הסתרת כפתור פתיחת sidebar */
    button[kind="header"] {
        display: none !important;
    }
    
    /* הסתרת תפריט המבורגר */
    [data-testid="collapsedControl"] {
        display: none !important;
    }
    
    /* במובייל */
    @media (max-width: 768px) {
        
        /* כותרות - צבע כהה וקריא + כיוון מימין לשמאל */
        h1, h2, h3, h4, h5, h6 {
            color: #1e293b !important;
            font-weight: 700 !important;
            direction: rtl !important;
            text-align: right !important;
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
    """העלאת תמונה ל-Supabase Storage עם שם קובץ בטוח (ASCII בלבד)"""
    try:
        # המרת התמונה ל-JPEG
        img = Image.open(io.BytesIO(photo_bytes)).convert('RGB')
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=80)
        
        # יצירת שם קובץ בטוח לחלוטין - רק תווים באנגלית ומספרים
        # שימוש ב-UUID וזמן יוניקס למניעת כל סיכוי לבעיות קידוד
        import uuid
        file_ext = "jpg"
        safe_filename = f"report_{int(time.time())}_{str(uuid.uuid4())[:8]}.{file_ext}"
        
        # נתיב הקובץ
        file_path = f"reports/{safe_filename}"
        
        # העלאה ל-Supabase Storage
        supabase.storage.from_("report-photos").upload(
            file_path, 
            output.getvalue(), 
            {"content-type": "image/jpeg"}
        )
        
        # יצירת URL ציבורי
        project_url = st.secrets['supabase']['url'].rstrip("/")
        public_url = f"{project_url}/storage/v1/object/public/report-photos/{file_path}"
        
        return public_url
        
    except Exception as e:
        # הדפסת שגיאה מפורטת ללוג
        print(f"Upload error: {str(e)}")
        st.error(f"❌ שגיאה בהעלאת תמונה: {str(e)}")
        if "InvalidKey" in str(e):
             st.warning("💡 השגיאה נובעת משם קובץ לא תקין. הקוד החדש אמור לפתור זאת.")
        return None

def apply_custom_css():
    """החלת עיצוב CSS מותאם אישית"""
    st.markdown("""
        <style>
        /* יישור לימין לכל האפליקציה */
        .stApp {
            direction: rtl;
            text-align: right;
        }
        
        /* כפיית צבע טקסט כהה עבור נראות במחשב - כולל שאלונים והודעות */
        .stMarkdown, .stText, h1, h2, h3, h4, h5, h6, .stMetricLabel, .stMetricValue, 
        .stRadio label, .stCheckbox label, .stTextInput label, .stSelectbox label, 
        .stTextArea label, .stFileUploader label, .stAlert {
            color: #1e293b !important;
        }
        
        /* צבע טקסט בתוך התיבות עצמן */
        .stTextInput input, .stTextArea textarea, .stSelectbox select {
            color: #1e293b !important;
        }
        
        /* רקע בהיר לאפליקציה */
        .stApp {
            background-color: #f8fafc;
        }
        
        /* הודעות (Alerts) */
        .stAlert {
            background-color: white; /* רקע לבן להודעות כדי שהטקסט יבלוט */
            border: 1px solid #e2e8f0;
        }
        
        /* כרטיסים מעוצבים */
        .css-1r6slb0, .stCard {
            background-color: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        
        /* כפתורים */
        .stButton button {
            width: 100%;
            border-radius: 0.5rem;
            font-weight: bold;
        }
        
        /* מדדים */
        div[data-testid="stMetricValue"] {
            font-size: 2rem;
            font-weight: bold;
            color: #1e3a8a !important; /* כחול כהה */
        }
        
        div[data-testid="stMetricLabel"] {
            font-size: 1rem;
            color: #64748b !important; /* אפור כהה */
        }
        
        /* טבלאות */
        table {
            color: #1e293b !important;
        }
        </style>
    """, unsafe_allow_html=True)

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
        result = supabase.table("unit_passwords").upsert({
            "unit_name": unit_name, 
            "password": hashed, 
            "role": role
        }, on_conflict="unit_name").execute()
        return True, "הסיסמה עודכנה בהצלחה"
    except Exception as e:
        error_msg = str(e)
        return False, f"שגיאה: {error_msg}"


def add_gps_privacy_offset(lat: float, lon: float, offset_meters: int = 300) -> Tuple[float, float]:
    """
    מוסיף רעש אקראי למיקום GPS לצורכי אבטחה
    מזיז את המיקום ב-~300 מטר כדי שלא לחשוף את המיקום המדויק של המוצב
    
    Args:
        lat: קו רוחב
        lon: קו אורך  
        offset_meters: מרחק מקסימלי במטרים (ברירת מחדל: 300)
    
    Returns:
        tuple: (lat_with_offset, lon_with_offset)
    """
    # המרה ממטרים לדרגות (קירוב: 1 מעלה = ~111km)
    offset_degrees = offset_meters / 111000.0
    
    # רעש אקראי בכיוון אקראי
    random_angle = random.uniform(0, 2 * math.pi)
    random_distance = random.uniform(0, offset_degrees)
    
    # חישוב ההסטה
    lat_offset = random_distance * math.cos(random_angle)
    lon_offset = random_distance * math.sin(random_angle) / math.cos(math.radians(lat))
    
    return (lat + lat_offset, lon + lon_offset)


# ===== מעקב חוסרים =====

def detect_and_track_deficits(report_data: dict, report_id: str, unit: str):
    """
    🔧 תיקון: זיהוי אוטומטי חכם של חוסרים עם סנכרון מלא
    - מזהה חוסרים חדשים לפי מוצב (ולא רק יחידה)
    - מעדכן חוסרים קיימים אם הכמות השתנתה
    - סוגר אוטומטית חוסרים שהושלמו (10→0)
    """
    try:
        base = report_data.get('base', 'לא ידוע')  # ✅ עכשיו לפי מוצב!
        current_date = datetime.datetime.now().isoformat()
        
        # רשימת כל סוגי החוסרים לבדיקה
        deficit_checks = [
            ('mezuzot', int(report_data.get('r_mezuzot_missing', 0))),
            ('eruv_kelim', 1 if report_data.get('p_mix', 'לא') == 'כן' else 0),
            ('kashrut_cert', 1 if report_data.get('k_cert', 'לא') == 'לא' else 0),
            ('eruv_status', 1 if report_data.get('e_status', 'תקין') == 'פסול' else 0),
            ('shabbat_supervisor', 1 if report_data.get('k_shabbat_supervisor', 'כן') == 'לא' else 0),
        ]
        
        for deficit_type, current_count in deficit_checks:
            # ✅ בדיקה אם יש חוסר פתוח מסוג זה עבור אותו מוצב
            existing = supabase.table("deficit_tracking")\
                .select("*")\
                .eq("unit", unit)\
                .eq("base", base)\
                .eq("deficit_type", deficit_type)\
                .eq("status", "open")\
                .execute()
            
            if current_count > 0:
                # ✅ יש חוסר בדוח הנוכחי
                if existing.data:
                    # ✅ עדכון חוסר קיים אם הכמות השתנתה
                    existing_deficit = existing.data[0]
                    if existing_deficit['deficit_count'] != current_count:
                        supabase.table("deficit_tracking").update({
                            'deficit_count': current_count,
                            'updated_at': current_date,
                            'last_report_id': report_id
                        }).eq("id", existing_deficit['id']).execute()
                else:
                    # ✅ יצירת רשומת חוסר חדשה
                    supabase.table("deficit_tracking").insert({
                        'unit': unit,
                        'base': base,
                        'deficit_type': deficit_type,
                        'deficit_count': current_count,
                        'status': 'open',
                        'detected_date': current_date,
                        'report_id': report_id,
                        'last_report_id': report_id
                    }).execute()
            else:
                # ✅ אין חוסר בדוח הנוכחי - סגירה אוטומטית!
                if existing.data:
                    for deficit in existing.data:
                        supabase.table("deficit_tracking").update({
                            'status': 'closed',
                            'resolved_date': current_date,
                            'updated_at': current_date,
                            'resolution_report_id': report_id,
                            'notes': f'✅ החוסר הושלם אוטומטית - דווח 0 בדוח מתאריך {current_date[:10]}'
                        }).eq("id", deficit['id']).execute()
        
    except Exception as e:
        print(f"⚠️ שגיאה במעקב חוסרים: {e}")


def calculate_total_deficits_from_reports(df):
    """
    ✅ חישוב מדויק של סך החוסרים מהדוחות
    לוקח את הדוח האחרון לכל מוצב ומסכם
    """
    import pandas as pd
    
    if df.empty or 'date' not in df.columns:
        return {'mezuzot': 0, 'eruv_kelim': 0, 'kashrut_cert': 0, 'eruv_broken': 0, 'no_supervisor': 0}
    
    # המרת תאריכים אם צריך
    if not pd.api.types.is_datetime64_any_dtype(df['date']):
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
    
    # ✅ קבלת הדוח האחרון לכל מוצב
    latest_reports = df.sort_values('date').groupby('base').tail(1)
    
    # ✅ חישוב סך החוסרים מהדוחות האחרונים
    total_mezuzot = latest_reports['r_mezuzot_missing'].sum() if 'r_mezuzot_missing' in latest_reports.columns else 0
    total_eruv_kelim = len(latest_reports[latest_reports['p_mix'] == 'כן']) if 'p_mix' in latest_reports.columns else 0
    total_no_cert = len(latest_reports[latest_reports['k_cert'] == 'לא']) if 'k_cert' in latest_reports.columns else 0
    total_eruv_broken = len(latest_reports[latest_reports['e_status'] == 'פסול']) if 'e_status' in latest_reports.columns else 0
    total_no_supervisor = len(latest_reports[latest_reports['k_shabbat_supervisor'] == 'לא']) if 'k_shabbat_supervisor' in latest_reports.columns else 0
    
    return {
        'mezuzot': int(total_mezuzot),
        'eruv_kelim': total_eruv_kelim,
        'kashrut_cert': total_no_cert,
        'eruv_broken': total_eruv_broken,
        'no_supervisor': total_no_supervisor
    }


def get_open_deficits(units: list):
    """✅ קבלת חוסרים פתוחים - עם סינון נכון"""
    try:
        result = supabase.table("deficit_tracking")\
            .select("*")\
            .in_("unit", units)\
            .eq("status", "open")\
            .order("detected_date", desc=True)\
            .execute()
        
        import pandas as pd
        return pd.DataFrame(result.data) if result.data else pd.DataFrame()
    except Exception as e:
        print(f"❌ שגיאה בטעינת חוסרים: {e}")
        import streamlit as st
        st.error(f"❌ שגיאה בטעינת חוסרים: {e}")
        import pandas as pd
        return pd.DataFrame()


def get_deficit_statistics(units: list):
    """✅ סטטיסטיקות חוסרים - מדויקות ומסונכרנות"""
    try:
        import pandas as pd
        
        open_result = supabase.table("deficit_tracking")\
            .select("*", count="exact")\
            .in_("unit", units)\
            .eq("status", "open")\
            .execute()
        
        closed_result = supabase.table("deficit_tracking")\
            .select("*")\
            .in_("unit", units)\
            .eq("status", "closed")\
            .execute()
        
        avg_resolution_days = 0
        if closed_result.data:
            total_days, count = 0, 0
            for deficit in closed_result.data:
                if deficit.get('resolved_date') and deficit.get('detected_date'):
                    detected = pd.to_datetime(deficit['detected_date'])
                    resolved = pd.to_datetime(deficit['resolved_date'])
                    total_days += (resolved - detected).days
                    count += 1
            avg_resolution_days = total_days / count if count > 0 else 0
        
        return {
            'total_open': len(open_result.data) if open_result.data else 0,
            'total_closed': len(closed_result.data) if closed_result.data else 0,
            'avg_resolution_days': avg_resolution_days
        }
    except Exception as e:
        print(f"❌ שגיאה בחישוב סטטיסטיקות: {e}")
        import streamlit as st
        st.error(f"❌ שגיאה בחישוב סטטיסטיקות: {e}")
        return {'total_open': 0, 'total_closed': 0, 'avg_resolution_days': 0}


def update_deficit_status(deficit_id: str, status: str, notes: str = ""):
    """✅ עדכון סטטוס חוסר"""
    try:
        update_data = {'status': status, 'updated_at': datetime.datetime.now().isoformat()}
        if notes:
            update_data['notes'] = notes
        if status == 'closed':
            update_data['resolved_date'] = datetime.datetime.now().isoformat()
        
        supabase.table("deficit_tracking").update(update_data).eq("id", deficit_id).execute()
        return True
    except Exception as e:
        print(f"❌ שגיאה בעדכון סטטוס: {e}")
        import streamlit as st
        st.error(f"❌ שגיאה בעדכון סטטוס: {e}")
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
    
    # שעות פעילות - בדיקה של עמודת time תחילה, אחר כך date
    if 'time' in current_month.columns:
        # אם יש עמודת time, השתמש בה
        def extract_hour_from_time(time_val):
            try:
                if pd.isna(time_val):
                    return None
                time_str = str(time_val)
                if ':' in time_str:
                    return int(time_str.split(':')[0])
                return None
            except:
                return None
        current_month['hour'] = current_month['time'].apply(extract_hour_from_time)
        peak_hours = current_month['hour'].dropna().value_counts().head(3)
    elif pd.api.types.is_datetime64_any_dtype(current_month['date']):
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


def create_full_report_excel(df):
    """
    ✅ תיקון מלא: יצירת Excel ללא שגיאות
    """
    try:
        import io
        import pandas as pd
        from openpyxl.styles import Font, PatternFill, Side, Alignment, Border
        from openpyxl.utils import get_column_letter

        if df.empty:
            return None
            
        # מיפוי עמודות
        column_mapping = {
            'date': 'תאריך',
            'base': 'מוצב',
            'inspector': 'מבקר',
            'e_status': 'סטטוס עירוב',
            'k_cert': 'תעודת כשרות',
            'k_issues_description': 'פירוט תקלות',
            'k_separation': 'הפרדת כלים',
            'p_mix': 'ערבוב כלים',
            'k_products': 'רכש חוץ',
            'k_bishul': 'בישול ישראל',
            'soldier_want_lesson': 'רצון לשיעור',
            'soldier_has_lesson': 'יש שיעור',
            'soldier_lesson_teacher': 'מעביר שיעור',
            'soldier_lesson_phone': 'טלפון',
            'r_mezuzot_missing': 'מזוזות חסרות',
            'missing_items': 'חוסרים',
            'free_text': 'הערות'
        }
        
        # סינון עמודות
        available_cols = [col for col in column_mapping.keys() if col in df.columns]
        export_df = df[available_cols].copy()
        export_df.rename(columns=column_mapping, inplace=True)
        
        # תאריכים
        if 'תאריך' in export_df.columns:
            export_df['תאריך'] = pd.to_datetime(export_df['תאריך']).dt.strftime('%d/%m/%Y %H:%M')

        # יצירת הקובץ
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # ✅ כתיבת הגיליון
            export_df.to_excel(writer, index=False, sheet_name='דוחות רבנות')
            
            # ✅ קבלת הגיליון
            workbook = writer.book
            worksheet = writer.sheets['דוחות רבנות']
            
            # ✅ **חשוב מאוד** - וודא שהגיליון נראה
            worksheet.sheet_state = 'visible'
            
            # כיוון RTL
            worksheet.sheet_view.rightToLeft = True
            
            # עיצוב
            header_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
            header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
            border_style = Side(border_style='thin', color='000000')
            thin_border = Border(
                left=border_style, right=border_style,
                top=border_style, bottom=border_style
            )
            alignment_right = Alignment(horizontal='right', vertical='center', wrap_text=True)
            
            # עיצוב כותרות
            for cell in worksheet[1]:
                cell.font = header_font
                cell.fill = header_fill
                cell.border = thin_border
                cell.alignment = alignment_right
                
            # עיצוב תאים
            for row in worksheet.iter_rows(min_row=2, max_row=worksheet.max_row):
                for cell in row:
                    cell.border = thin_border
                    cell.alignment = alignment_right
                    
            # פילטרים
            worksheet.auto_filter.ref = worksheet.dimensions
            
            # רוחב עמודות
            for column in worksheet.columns:
                max_length = 0
                column_letter = get_column_letter(column[0].column)
                
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                        
                adjusted_width = min(max_length + 2, 40)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        # ✅ בדיקה נוספת שהגיליון נראה (למקרה שנדרס)
        output.seek(0)
        import openpyxl
        wb = openpyxl.load_workbook(output)
        
        # ✅ אם אין גיליון נראה - הפוך את הראשון לנראה
        visible_count = sum(1 for sheet in wb.worksheets if sheet.sheet_state == 'visible')
        if visible_count == 0 and len(wb.worksheets) > 0:
            wb.worksheets[0].sheet_state = 'visible'
        
        # שמירה מחדש
        final_output = io.BytesIO()
        wb.save(final_output)
        final_output.seek(0)
        
        return final_output.getvalue()
        
    except Exception as e:
        print(f"❌ Excel Error: {e}")
        return None

def create_inspector_excel(df):
    """יצירת קובץ Excel עם סטטיסטיקות מבקרים (מוגבל ל-10 שורות)"""
    import io
    try:
        import openpyxl
    except ImportError:
        return None
        
    from datetime import datetime
    
    stats = generate_inspector_stats(df)
    if not stats:
        # יצירת מילון ריק כדי למנוע קריסה ולאפשר יצירת קובץ
        stats = {
            'top_inspectors': pd.Series(dtype='object'),
            'top_locations': pd.Series(dtype='object'),
            'peak_hours': pd.Series(dtype='object'),
            'total_reports': len(df),
            'unique_inspectors': 0
        }
    
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
    
    /* תיקון לאייקונים של Streamlit */
    .st-emotion-cache-1p1m4ay, .st-emotion-cache-12fmjuu {{
        font-family: "Source Sans Pro", sans-serif !important;
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
    
    # כפתור יציאה בראש הדף
    col_logout, col_title = st.columns([1, 5])
    with col_logout:
        if st.button("🚪 יציאה", key="logout_cmd", use_container_width=True):
            st.session_state.logged_in = False
            st.session_state.selected_unit = None
            st.session_state.login_stage = "gallery"  # חזרה לגלריה הראשית
            st.rerun()
    
    with col_title:
        st.markdown(f"## 🎯 מרכז בקרה פיקודי - {unit}")
    
    # ✅ הכנת הקובץ מראש - לפני הטאבים (דוח ארצי מלא)
    all_data_for_excel = load_reports_cached(None) # None = כל הארץ
    df_full = pd.DataFrame(all_data_for_excel) if all_data_for_excel else pd.DataFrame()
    
    excel_file_ready = None
    if not df_full.empty:
        try:
            excel_file_ready = create_full_report_excel(df_full)
        except Exception as e:
            st.error(f"שגיאה ביצירת קובץ Excel: {e}")
    
    # ✅ כפתור הורדה בולט - מחוץ לכל לוגיקה מורכבת
    st.markdown("---")
    if excel_file_ready:
        st.download_button(
            label="📥 הורד דוח ארצי מלא (כל היחידות)",
            data=excel_file_ready,
            file_name=f"full_national_report_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
            type="primary",
            key="national_excel_btn_stable"
        )
    else:
        if df.empty:
            st.info("📊 אין נתונים זמינים כרגע.")
        else:
            # st.warning("⚠️ לא ניתן ליצור קובץ Excel כרגע")
            pass
    
    st.markdown("---")
    
    # המשך הקוד הקיים עם הטאבים...
    if df.empty:
        return  # ✅ עצור כאן אם אין נתונים

    # טאבים לפי תפקיד
    if role == 'pikud':
        tabs = st.tabs(["📊 סקירה כללית", "🏆 ליגת יחידות", "🤖 תובנות AI", "📈 ניתוח יחידה", "📋 מעקב חוסרים", "🗺️ Map", "⚙️ ניהול"])
    else:
        tabs = st.tabs(["📊 סקירה כללית", "🏆 ליגת יחידות", "🤖 תובנות AI", "📈 ניתוח יחידה", "📋 מעקב חוסרים", "🗺️ Map"])
    
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
                    marker=dict(colors=[colors_map.get(x, '#64748b') for x in eruv_counts.index]),
                    textfont=dict(color='#1e293b', size=14),
                    textposition='inside'
                )])
                fig.update_layout(
                    height=350,
                    paper_bgcolor='white',
                    plot_bgcolor='white',
                    font=dict(color='#1e293b')
                )
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
            
            # פרטי שאלון מפורטים
            st.markdown("### 📋 פירוט שאלון ביקורת")
            
            # קבלת הדוח האחרון והקודם לו למעקב שינויים
            latest_report = unit_df.sort_values('date', ascending=False).iloc[0] if len(unit_df) > 0 else None
            previous_report = unit_df.sort_values('date', ascending=False).iloc[1] if len(unit_df) > 1 else None
            
            # טאבים לקטגוריות שונות
            detail_tabs = st.tabs(["🔴 חוסרים ובעיות", "🍴 עירוב וכשרות", "🏗️ תשתיות ויומן ביקורת", "📊 סיכום כללי"])
            
            with detail_tabs[0]:  # חוסרים
                st.markdown("#### חוסרים שדווחו")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    # מזוזות
                    mezuzot_missing = int(latest_report.get('r_mezuzot_missing', 0)) if latest_report is not None else 0
                    prev_mezuzot = int(previous_report.get('r_mezuzot_missing', 0)) if previous_report is not None else mezuzot_missing
                    
                    if mezuzot_missing > 0:
                        if mezuzot_missing < prev_mezuzot:
                            diff = prev_mezuzot - mezuzot_missing
                            pct = (diff / prev_mezuzot * 100) if prev_mezuzot > 0 else 0
                            st.metric("📜 מזוזות חסרות", mezuzot_missing, f"-{diff} ({pct:.0f}%)", delta_color="inverse")
                            st.success(f"✅ שיפור! הושלמו {diff} מזוזות מהדוח הקודם")
                        elif mezuzot_missing > prev_mezuzot:
                            diff = mezuzot_missing - prev_mezuzot
                            pct = (diff / prev_mezuzot * 100) if prev_mezuzot > 0 else 0
                            st.metric("📜 מזוזות חסרות", mezuzot_missing, f"+{diff} ({pct:.0f}%)")
                            st.warning(f"⚠️ החוסר גדל ב-{diff} מזוזות")
                        else:
                            st.metric("📜 מזוזות חסרות", mezuzot_missing, "ללא שינוי")
                    else:
                        st.metric("📜 מזוזות חסרות", "0 🟢", "תקין")
                    
                    # ספרי תורה
                    torah_missing = int(latest_report.get('r_torah_missing', 0)) if latest_report is not None else 0
                    if torah_missing > 0:
                        st.metric("📖 ספרי תורה חסרים", torah_missing, delta_color="inverse")
                    else:
                        st.metric("📖 ספרי תורה", "תקין 🟢")
                
                with col2:
                    # ציצית
                    tzitzit_missing = int(latest_report.get('r_tzitzit_missing', 0)) if latest_report is not None else 0
                    if tzitzit_missing > 0:
                        st.metric("🧵 ציציות חסרות", tzitzit_missing, delta_color="inverse")
                    else:
                        st.metric("🧵 ציציות", "תקין 🟢")
                    
                    # תפילין
                    tefillin_missing = int(latest_report.get('r_tefillin_missing', 0)) if latest_report is not None else 0
                    if tefillin_missing > 0:
                        st.metric("📿 תפילין חסרים", tefillin_missing, delta_color="inverse")
                    else:
                        st.metric("📿 תפילין", "תקין 🟢")
            
            with detail_tabs[1]:  # עירוב וכשרות
                st.markdown("#### סטטוס עירוב וכשרות")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    # סטטוס עירוב
                    eruv_status = latest_report.get('e_status', 'לא ידוע') if latest_report is not None else 'לא ידוע'
                    if eruv_status == 'תקין':
                        st.success(f"✅ **סטטוס עירוב:** {eruv_status}")
                    elif eruv_status == 'פסול':
                        st.error(f"❌ **סטטוס עירוב:** {eruv_status}")
                    else:
                        st.warning(f"⚠️ **סטטוס עירוב:** {eruv_status}")
                    
                    # עירוב כלים
                    eruv_kelim = latest_report.get('k_eruv_kelim', 'לא') if latest_report is not None else 'לא'
                    prev_eruv_kelim = previous_report.get('k_eruv_kelim', 'לא') if previous_report is not None else 'לא'
                    
                    if eruv_kelim == 'כן':
                        st.error("🔴 **עירוב כלים:** קיים - דורש טיפול")
                    else:
                        if prev_eruv_kelim == 'כן' and eruv_kelim == 'לא':
                            st.success("✅ **עירוב כלים:** תוקן מהדוח הקודם!")
                        else:
                            st.success("🟢 **עירוב כלים:** לא קיים")
                
                with col2:
                    # תעודת כשרות
                    k_cert = latest_report.get('k_cert', 'לא') if latest_report is not None else 'לא'
                    if k_cert == 'כן':
                        st.success("✅ **תעודת כשרות:** קיימת")
                    else:
                        st.warning("⚠️ **תעודת כשרות:** חסרה")
                    
                    # סגירת טרקלין
                    traklin_closed = latest_report.get('k_traklin_closed', 'לא') if latest_report is not None else 'לא'
                    if traklin_closed == 'כן':
                        st.success("✅ **סגירת טרקלין:** מבוצעת")
                    else:
                        st.warning("⚠️ **סגירת טרקלין:** לא מבוצעת")
            
            with detail_tabs[2]:  # תשתיות
                st.markdown("#### תשתיות ויומן ביקורת")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    # יומן ביקורת
                    pikubok = latest_report.get('k_pikubok', 'לא') if latest_report is not None else 'לא'
                    if pikubok == 'כן':
                        st.success("✅ **יומן ביקורת:** קיים")
                    else:
                        st.warning("⚠️ **יומן ביקורת:** לא קיים")
                    
                    # נהלים
                    procedures = latest_report.get('k_streams', 'לא') if latest_report is not None else 'לא'
                    if procedures == 'כן':
                        st.info("📋 **נהלים מעודכנים:** קיימים")
                    else:
                        st.warning("⚠️ **נהלים מעודכנים:** לא קיימים")
                
                with col2:
                    # הערות כלליות
                    notes = latest_report.get('notes', '') if latest_report is not None else ''
                    if notes and notes.strip():
                        st.text_area("📝 הערות והמלצות", notes, height=100, disabled=True)
                    else:
                        st.info("אין הערות נוספות")
            
            with detail_tabs[3]:  # סיכום
                st.markdown("#### סיכום מצב היחידה")
                
                # חישוב אחוזי תקינות
                total_checks = 10  # סה"כ בדיקות
                passed_checks = 0
                
                if mezuzot_missing == 0: passed_checks += 1
                if torah_missing == 0: passed_checks += 1
                if tzitzit_missing == 0: passed_checks += 1
                if tefillin_missing == 0: passed_checks += 1
                if eruv_status == 'תקין': passed_checks += 1
                if eruv_kelim == 'לא': passed_checks += 1
                if k_cert == 'כן': passed_checks += 1
                if traklin_closed == 'כן': passed_checks += 1
                if pikubok == 'כן': passed_checks += 1
                if procedures == 'כן': passed_checks += 1
                
                compliance_pct = (passed_checks / total_checks) * 100
                
                st.metric("📊 אחוז תקינות כללי", f"{compliance_pct:.0f}%")
                st.progress(compliance_pct / 100)
                
                if compliance_pct >= 90:
                    st.success("🌟 **מצוין!** היחידה במצב תקין מעולה")
                elif compliance_pct >= 70:
                    st.info("👍 **טוב** - יש מקום לשיפור קל")
                elif compliance_pct >= 50:
                    st.warning("⚠️ **בינוני** - דורש תשומת לב")
                else:
                    st.error("🔴 **דורש טיפול דחוף** - נושאים רבים לטיפול")
                
                # רשימת נושאים לטיפול
                issues = []
                if mezuzot_missing > 0: issues.append(f"📜 {mezuzot_missing} מזוזות חסרות")
                if torah_missing > 0: issues.append(f"📖 {torah_missing} ספרי תורה חסרים")
                if tzitzit_missing > 0: issues.append(f"🧵 {tzitzit_missing} ציציות חסרות")
                if tefillin_missing > 0: issues.append(f"📿 {tefillin_missing} תפילין חסרים")
                if eruv_status != 'תקין': issues.append(f"⚠️ עירוב {eruv_status}")
                if eruv_kelim == 'כן': issues.append("🔴 עירוב כלים קיים")
                if k_cert != 'כן': issues.append("⚠️ תעודת כשרות חסרה")
                if traklin_closed != 'כן': issues.append("⚠️ סגירת טרקלין לא מבוצעת")
                if pikubok != 'כן': issues.append("⚠️ פיקבוק לא קיים")
                
                if issues:
                    st.markdown("**נושאים לטיפול:**")
                    for issue in issues:
                        st.markdown(f"- {issue}")
                else:
                    st.success("✅ אין נושאים פתוחים לטיפול!")
            
            st.markdown("---")
            
            # תובנות
            st.markdown("### 💡 תובנות ומסקנות")
            
            # כפתור הורדה בסיכום הכללי
            enhanced_excel_tab = create_enhanced_excel_report(unit_df, unit_name=selected_unit)
            if enhanced_excel_tab:
                st.download_button(
                    label="📥 הורד דוח מפורט משופר (Excel)",
                    data=enhanced_excel_tab,
                    file_name=f"detailed_report_{selected_unit}_{pd.Timestamp.now().strftime('%Y%m')}.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True,
                    key="dl_detailed_tab_main",
                    type="primary"
                )
                
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
                
               # ===== קוד מעודכן לטבלה המפורטת =====
# החלף את החלק של display_df בטאב "ניתוח יחידה" עם הקוד הזה:

        st.markdown("---")
        
        # ===== טבלה מורחבת עם כל העמודות החדשות =====
        st.markdown("#### 📋 דוחות מפורטים - תצוגה מלאה")
        
        # בניית רשימת עמודות בסדר לוגי
        base_columns = ['date', 'base', 'inspector']
        
        # עמודות מצב בסיסיות
        status_columns = []
        if 'e_status' in unit_df.columns:
            status_columns.append('e_status')
        if 'k_cert' in unit_df.columns:
            status_columns.append('k_cert')
        
        # 🆕 עמודות תקלות כשרות (הכל!)
        kashrut_issues_columns = []
        if 'k_issues' in unit_df.columns:
            kashrut_issues_columns.append('k_issues')
        if 'k_issues_description' in unit_df.columns:
            kashrut_issues_columns.append('k_issues_description')
        if 'k_separation' in unit_df.columns:
            kashrut_issues_columns.append('k_separation')
        if 'p_mix' in unit_df.columns:
            kashrut_issues_columns.append('p_mix')
        if 'k_products' in unit_df.columns:
            kashrut_issues_columns.append('k_products')
        if 'k_bishul' in unit_df.columns:
            kashrut_issues_columns.append('k_bishul')
        
        # 🆕 עמודות שיעורי תורה (הכל!)
        torah_columns = []
        if 'soldier_want_lesson' in unit_df.columns:
            torah_columns.append('soldier_want_lesson')
        if 'soldier_has_lesson' in unit_df.columns:
            torah_columns.append('soldier_has_lesson')
        if 'soldier_lesson_teacher' in unit_df.columns:
            torah_columns.append('soldier_lesson_teacher')
        if 'soldier_lesson_phone' in unit_df.columns:
            torah_columns.append('soldier_lesson_phone')
        if 'soldier_yeshiva' in unit_df.columns:
            torah_columns.append('soldier_yeshiva')
        
        # 🆕 עמודות חוסרים ונוספות
        other_columns = []
        if 'r_mezuzot_missing' in unit_df.columns:
            other_columns.append('r_mezuzot_missing')
        if 'missing_items' in unit_df.columns:
            other_columns.append('missing_items')
        if 'free_text' in unit_df.columns:
            other_columns.append('free_text')
        
        # איחוד כל העמודות
        all_columns = base_columns + status_columns + kashrut_issues_columns + torah_columns + other_columns
        
        # סינון רק עמודות קיימות
        available_columns = [col for col in all_columns if col in unit_df.columns]
        
        # יצירת DataFrame לתצוגה
        if available_columns:
            display_df = unit_df[available_columns].copy()
            
            # 🆕 מיפוי שמות עמודות לעברית - מלא ומפורט
            column_mapping = {
                # בסיסי
                'date': 'תאריך',
                'base': 'מוצב',
                'inspector': 'מבקר',
                
                # מצב
                'e_status': 'סטטוס עירוב',
                'k_cert': 'תעודת כשרות',
                
                # תקלות כשרות
                'k_issues': '❗ יש תקלות כשרות?',
                'k_issues_description': '📝 פירוט תקלות כשרות',
                'k_separation': 'הפרדת כלים',
                'p_mix': '🔴 ערבוב כלים',
                'k_products': 'רכש חוץ לא מאושר',
                'k_bishul': 'בישול ישראל',
                
                # שיעורי תורה
                'soldier_want_lesson': '💡 רצון לשיעור תורה',
                'soldier_has_lesson': '📚 יש שיעור במוצב?',
                'soldier_lesson_teacher': '👨‍🏫 שם מעביר השיעור',
                'soldier_lesson_phone': '📞 טלפון מעביר השיעור',
                'soldier_yeshiva': 'ימי ישיבה',
                
                # חוסרים ונוספים
                'r_mezuzot_missing': '📜 מזוזות חסרות',
                'missing_items': '⚠️ חוסרים כלליים',
                'free_text': '📝 הערות נוספות'
            }
            
            # החלפת שמות העמודות
            display_df.columns = [column_mapping.get(col, col) for col in display_df.columns]
            
            # הצגת הטבלה
            st.dataframe(
                display_df,
                use_container_width=True,
                hide_index=True,
                height=400
            )
        else:
            st.warning("לא נמצאו עמודות להצגה")
        
        # 🆕 כפתור הורדה למפקדים
        st.markdown("---")
        
        try:
            full_report_excel_cmd = create_full_report_excel(unit_df)
            if full_report_excel_cmd:
                st.download_button(
                    label="📥 לחץ כאן להורדת קובץ Excel מלא",
                    data=full_report_excel_cmd,
                    file_name=f"full_report_{selected_unit}_{datetime.date.today().strftime('%d%m%y')}.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True,
                    type="primary",
                    key=f"dl_excel_pikud_detailed_{selected_unit}_{int(time.time())}"
                )
            else:
                st.info("ℹ️ לא ניתן ליצור קובץ Excel כרגע (אין נתונים מספיקים)")
        except Exception as e:
            st.error(f"שגיאה ביצירת קובץ Excel: {e}")
            
        st.caption("📊 הקובץ כולל את כל השאלות והתשובות מהשאלון")
        
        st.markdown("---")
        
        # 🆕 סיכומים מפורטים אחרי הטבלה
        st.markdown("### 📊 סיכומים מקיפים")
        
        # סיכום תקלות כשרות
        if kashrut_issues_columns:
            st.markdown("#### 🔍 סיכום תקלות כשרות")
            
            cols = st.columns(min(4, len(kashrut_issues_columns)))
            col_idx = 0
            
            if 'k_issues' in unit_df.columns:
                has_issues = len(unit_df[unit_df['k_issues'] == 'כן'])
                with cols[col_idx]:
                    st.metric("מוצבים עם תקלות", has_issues, 
                             delta=f"-{len(unit_df) - has_issues}" if has_issues > 0 else "אין תקלות",
                             delta_color="inverse" if has_issues > 0 else "off")
                col_idx += 1
            
            if 'p_mix' in unit_df.columns:
                mixing = len(unit_df[unit_df['p_mix'] == 'כן'])
                with cols[col_idx % len(cols)]:
                    st.metric("🔴 ערבוב כלים", mixing, delta_color="inverse")
                col_idx += 1
            
            if 'k_separation' in unit_df.columns:
                no_sep = len(unit_df[unit_df['k_separation'] == 'לא'])
                with cols[col_idx % len(cols)]:
                    st.metric("ללא הפרדה", no_sep, delta_color="inverse")
                col_idx += 1
            
            if 'k_bishul' in unit_df.columns:
                no_bishul = len(unit_df[unit_df['k_bishul'] == 'לא'])
                with cols[col_idx % len(cols)]:
                    st.metric("ללא בי״ש", no_bishul, delta_color="inverse")
            
            # פירוט תקלות ספציפיות
            if 'k_issues_description' in unit_df.columns:
                issues_with_description = unit_df[unit_df['k_issues_description'].notna() & (unit_df['k_issues_description'] != '')]
                if len(issues_with_description) > 0:
                    st.markdown("##### 📝 פירוט תקלות שדווחו:")
                    for idx, row in issues_with_description.iterrows():
                        base_name = row.get('base', 'לא ידוע')
                        description = row.get('k_issues_description', '')
                        date_str = row.get('date').strftime('%d/%m/%Y') if pd.notna(row.get('date')) else 'לא ידוע'
                        st.markdown(f"""
                        <div style='padding: 10px; background-color: #fee2e2; border-right: 4px solid #ef4444; 
                                    border-radius: 5px; margin-bottom: 10px;'>
                            <div style='font-weight: 700;'>📍 {base_name} | 📅 {date_str}</div>
                            <div style='margin-top: 5px; color: #475569;'>{description}</div>
                        </div>
                        """, unsafe_allow_html=True)
        
        # סיכום שיעורי תורה
        if torah_columns:
            st.markdown("<br>", unsafe_allow_html=True)
            st.markdown("#### 📚 סיכום שיעורי תורה")
            
            col1, col2, col3 = st.columns(3)
            
            if 'soldier_want_lesson' in unit_df.columns:
                want_lesson = len(unit_df[unit_df['soldier_want_lesson'] == 'כן'])
                col1.metric("💡 מעוניינים בשיעור", want_lesson,
                           help="מספר המוצבים שביקשו שיעור תורה")
            
            if 'soldier_has_lesson' in unit_df.columns:
                has_lesson = len(unit_df[unit_df['soldier_has_lesson'] == 'כן'])
                col2.metric("📚 יש שיעור פעיל", has_lesson,
                           help="מוצבים שכבר יש בהם שיעור תורה")
            
            if 'r_mezuzot_missing' in unit_df.columns:
                total_mezuzot = int(unit_df['r_mezuzot_missing'].sum())
                col3.metric("📜 סה״כ מזוזות חסרות", total_mezuzot,
                           delta_color="inverse" if total_mezuzot > 0 else "off")
            
            # רשימת מעבירי שיעורים עם פרטי קשר
            if 'soldier_lesson_teacher' in unit_df.columns and 'soldier_has_lesson' in unit_df.columns:
                active_lessons = unit_df[
                    (unit_df['soldier_has_lesson'] == 'כן') & 
                    (unit_df['soldier_lesson_teacher'].notna()) & 
                    (unit_df['soldier_lesson_teacher'] != '')
                ]
                
                if len(active_lessons) > 0:
                    st.markdown("##### 👨‍🏫 רשימת מעבירי שיעורים:")
                    for idx, row in active_lessons.iterrows():
                        teacher = row.get('soldier_lesson_teacher', 'לא ידוע')
                        phone = row.get('soldier_lesson_phone', '')
                        base_name = row.get('base', 'לא ידוע')
                        
                        phone_str = f" | 📞 {phone}" if phone else ""
                        st.markdown(f"""
                        <div style='padding: 10px; background-color: #dbeafe; border-right: 4px solid #3b82f6; 
                                    border-radius: 5px; margin-bottom: 8px;'>
                            <div style='font-weight: 700;'>📍 {base_name}</div>
                            <div style='margin-top: 5px;'>
                                👨‍🏫 {teacher}{phone_str}
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.info("💡 אין מוצבים עם מעבירי שיעורים רשומים")
            
            # מוצבים שרוצים שיעור אבל אין להם
            if 'soldier_want_lesson' in unit_df.columns and 'soldier_has_lesson' in unit_df.columns:
                want_but_no_lesson = unit_df[
                    (unit_df['soldier_want_lesson'] == 'כן') & 
                    (unit_df['soldier_has_lesson'] == 'לא')
                ]
                
                if len(want_but_no_lesson) > 0:
                    st.markdown("##### ⚠️ מוצבים שמעוניינים בשיעור אך אין להם:")
                    bases_list = ", ".join(want_but_no_lesson['base'].unique())
                    st.warning(f"📍 {bases_list}")
                    st.info("💡 יש לתאם מעביר שיעור למוצבים אלו")
        
        # סיכום חוסרים כלליים
        if 'missing_items' in unit_df.columns:
            items_with_missing = unit_df[unit_df['missing_items'].notna() & (unit_df['missing_items'] != '')]
            if len(items_with_missing) > 0:
                st.markdown("<br>", unsafe_allow_html=True)
                st.markdown("#### ⚠️ חוסרים כלליים שדווחו")
                
                for idx, row in items_with_missing.iterrows():
                    base_name = row.get('base', 'לא ידוע')
                    missing = row.get('missing_items', '')
                    date_str = row.get('date').strftime('%d/%m/%Y') if pd.notna(row.get('date')) else 'לא ידוע'
                    
                    st.markdown(f"""
                    <div style='padding: 12px; background-color: #fef3c7; border-right: 4px solid #f59e0b; 
                                border-radius: 5px; margin-bottom: 10px;'>
                        <div style='font-weight: 700;'>📍 {base_name} | 📅 {date_str}</div>
                        <div style='margin-top: 5px; color: #475569;'>{missing}</div>
                    </div>
                    """, unsafe_allow_html=True)
        
        st.markdown("---")
        

    
    # ===== טאב 5: מעקב חוסרים - מתוקן =====
    with tabs[4]:
        st.markdown("### 📋 מעקב חוסרים פתוחים")
        
        # ✅ קבלת חוסרים פתוחים
        accessible_units_list = accessible_units if isinstance(accessible_units, list) else list(accessible_units)
        deficits_df = get_open_deficits(accessible_units_list)
        
        # ✅ קבלת סטטיסטיקות מדויקות
        stats = get_deficit_statistics(accessible_units_list)
        
        # ✅ חישוב נוסף מהדוחות עצמם (לאימות)
        total_from_reports = calculate_total_deficits_from_reports(df)
        
        # סטטיסטיקות - שורה עליונה
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("🔴 חוסרים פתוחים", stats['total_open'], 
                     help="מספר החוסרים הפתוחים במערכת המעקב")
        with col2:
            # תצוגה של המזוזות החסרות מחישוב מהדוחות
            mezuzot_delta = total_from_reports['mezuzot'] - stats.get('total_mezuzot_tracked', 0) if 'total_mezuzot_tracked' in stats else None
            st.metric("📜 מזוזות (מדוחות)", total_from_reports['mezuzot'],
                     delta=f"+{mezuzot_delta}" if mezuzot_delta and mezuzot_delta > 0 else None,
                     help="חישוב מהדוח האחרון של כל מוצב")
        with col3:
            st.metric("✅ חוסרים שנסגרו", stats['total_closed'],
                     help="חוסרים שהושלמו ונסגרו")
        with col4:
            avg_days = stats['avg_resolution_days']
            st.metric("⏱️ זמן ממוצע לפתרון", 
                     f"{avg_days:.1f} ימים" if avg_days > 0 else "אין נתונים",
                     help="זמן ממוצע בימים עד סגירת חוסר")
        
        st.markdown("---")
        
        # סטטיסטיקות נוספות - שורה שנייה
        st.markdown("#### 📊 פירוט חוסרים לפי סוג")
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.metric("📜 מזוזות", total_from_reports['mezuzot'], 
                     help="סך כל המזוזות החסרות")
        with col2:
            st.metric("🔴 ערבוב כלים", total_from_reports['eruv_kelim'],
                     help="מוצבים עם ערבוב כלים")
        with col3:
            st.metric("📋 בלי תעודה", total_from_reports['kashrut_cert'],
                     help="מוצבים ללא תעודת כשרות")
        with col4:
            st.metric("🚧 עירוב פסול", total_from_reports['eruv_broken'],
                     help="מוצבים עם עירוב פסול")
        with col5:
            st.metric("👤 בלי נאמן", total_from_reports['no_supervisor'],
                     help="מוצבים ללא נאמן כשרות בשבת")
        
        st.markdown("---")
        
        # ✅ הצגת חוסרים לפי יחידה ומוצב
        if not deficits_df.empty:
            deficit_names = {
                'mezuzot': 'מזוזות חסרות',
                'eruv_kelim': 'ערבוב כלים',
                'kashrut_cert': 'תעודת כשרות חסרה',
                'eruv_status': 'עירוב פסול',
                'shabbat_supervisor': 'נאמן כשרות חסר'
            }
            
            # קבוצה לפי יחידה
            for unit in sorted(deficits_df['unit'].unique()):
                unit_deficits = deficits_df[deficits_df['unit'] == unit]
                
                # ספירת חוסרים לפי סוג
                deficit_types_count = unit_deficits['deficit_type'].value_counts()
                summary_text = ", ".join([f"{deficit_names.get(dt, dt)}: {count}" 
                                         for dt, count in deficit_types_count.items()])
                
                with st.expander(f"🔴 {unit} - {len(unit_deficits)} חוסרים פתוחים ({summary_text})"):
                    # ✅ קבוצה נוספת לפי מוצב
                    bases = unit_deficits['base'].unique() if 'base' in unit_deficits.columns else ['לא ידוע']
                    
                    for base in sorted(bases):
                        base_deficits = unit_deficits[unit_deficits['base'] == base] if 'base' in unit_deficits.columns else unit_deficits
                        
                        st.markdown(f"**📍 {base}:**")
                        
                        for _, deficit in base_deficits.iterrows():
                            deficit_type_he = deficit_names.get(deficit['deficit_type'], deficit['deficit_type'])
                            try:
                                detected_dt = pd.to_datetime(deficit.get('detected_date'), errors='coerce')
                                if pd.notna(detected_dt):
                                    detected_date = detected_dt.strftime('%d/%m/%Y')
                                    days_open = (pd.Timestamp.now() - detected_dt).days
                                else:
                                    detected_date = 'לא ידוע'
                                    days_open = 0
                            except Exception:
                                detected_date = 'לא ידוע'
                                days_open = 0
                            
                            # צבע לפי חומרת החוסר
                            severity_color = "#ef4444" if days_open > 30 else "#f59e0b" if days_open > 14 else "#10b981"
                            
                            col1, col2 = st.columns([3, 1])
                            with col1:
                                st.markdown(f"""
                                <div style="padding: 10px; border-right: 4px solid {severity_color}; background-color: #f8fafc; border-radius: 5px; margin-bottom: 10px;">
                                    <div style="font-weight: 700; font-size: 1.1rem;">• {deficit_type_he}</div>
                                    <div style="color: #64748b; font-size: 0.9rem;">
                                        כמות: <b>{deficit['deficit_count']}</b> | 
                                        זוהה: {detected_date} | 
                                        פתוח: <span style="color: {severity_color}; font-weight: 600;">{days_open} ימים</span>
                                    </div>
                                    {f"<div style='color: #475569; font-size: 0.85rem; margin-top: 5px;'>💬 {deficit.get('notes', '')}</div>" if deficit.get('notes') else ""}
                                </div>
                                """, unsafe_allow_html=True)
                            
                            with col2:
                                if st.button("✅ סגור", key=f"close_{deficit['id']}", use_container_width=True):
                                    if update_deficit_status(deficit['id'], 'closed', notes="נסגר ידנית על ידי מפקד"):
                                        st.success("✅ החוסר סומן כסגור!")
                                        time.sleep(0.5)
                                        st.rerun()
                        
                        st.markdown("---")
            
            # כפתור רענון
            if st.button("🔄 רענן מעקב חוסרים", use_container_width=True):
                clear_cache()
                st.rerun()
        
        else:
            st.success("🎉 אין חוסרים פתוחים במערכת המעקב!")
            
            # בדיקה אם יש אי-התאמה
            if any(v > 0 for v in total_from_reports.values()):
                st.warning("⚠️ **שים לב**: נמצאו חוסרים בדוחות האחרונים, אך הם עדיין לא במערכת המעקב.")
                st.info("💡 חוסרים חדשים יווצרו אוטומטית בדוח הבא שיוגש.")
                
                # הצגת החוסרים שנמצאו בדוחות
                st.markdown("**חוסרים שנמצאו בדוחות:**")
                if total_from_reports['mezuzot'] > 0:
                    st.markdown(f"- 📜 **{total_from_reports['mezuzot']} מזוזות חסרות**")
                if total_from_reports['eruv_kelim'] > 0:
                    st.markdown(f"- 🔴 **{total_from_reports['eruv_kelim']} מוצבים עם ערבוב כלים**")
                if total_from_reports['kashrut_cert'] > 0:
                    st.markdown(f"- 📋 **{total_from_reports['kashrut_cert']} מוצבים ללא תעודת כשרות**")
                if total_from_reports['eruv_broken'] > 0:
                    st.markdown(f"- 🚧 **{total_from_reports['eruv_broken']} מוצבים עם עירוב פסול**")
                if total_from_reports['no_supervisor'] > 0:
                    st.markdown(f"- 👤 **{total_from_reports['no_supervisor']} מוצבים ללא נאמן כשרות**")
    
    # ===== טאב 6: מפה ארצית =====
    with tabs[5]:
        st.markdown("### 🛰️ תמונת מצב ארצית - כלל המגזרים")
        st.info("🔐 **ביטחון מידע:** המיקומים מוזזים 300 מטר מהמיקום המדויק לצורכי אבטחת מידע")
        
        # שליפת כל הנתונים ללא סינון (None)
        map_raw = load_reports_cached(None)
        full_map_df = pd.DataFrame(map_raw) if map_raw else pd.DataFrame()
        
        if not full_map_df.empty:
            # ניקוי וביטול סינונים גאוגרפיים
            v_map = full_map_df.dropna(subset=['latitude', 'longitude']).copy()
            # גבולות רחבים מאוד (כל ישראל)
            v_map = v_map[(v_map['latitude'] > 29) & (v_map['latitude'] < 34)]
            
            # יצירת מפת Folium
            center_lat = v_map['latitude'].mean()
            center_lon = v_map['longitude'].mean()
            
            # מיפוי צבעים לפי יחידה
            unit_color_map = {
                "חטמ״ר בנימין": "#1e3a8a",
                "חטמ״ר שומרון": "#60a5fa",
                "חטמ״ר יהודה": "#22c55e",
                "חטמ״ר עציון": "#fb923c",
                "חטמ״ר אפרים": "#ef4444",
                "חטמ״ר מנשה": "#a855f7",
                "חטמ״ר הבקעה": "#db2777"
            }
            
            m = create_street_level_map(center=(center_lat, center_lon), zoom_start=8)
            
            for _, row in v_map.iterrows():
                add_unit_marker_to_folium(m, row, unit_color_map)
                
            st_folium(m, width=1200, height=700, key="global_dashboard_map", returned_objects=[])
            
            # מקרא
            st.markdown("#### 🔑 מקרא חטמ״רים")
            legend_html = "<div style='display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;'>"
            for unit_name in sorted(v_map['unit'].unique()) if 'unit' in v_map.columns else []:
                color = unit_color_map.get(unit_name, "#808080")
                count = len(v_map[v_map['unit'] == unit_name])
                legend_html += f"<div><span style='color: {color}; font-size: 1.5rem;'>●</span> {unit_name} ({count})</div>"
            legend_html += "</div>"
            st.markdown(legend_html, unsafe_allow_html=True)

        else:
            st.warning("⚠️ לא נמצאו נתוני מיקום")
    
    # ===== טאב 7: ניהול (רק פיקוד) =====
    if role == 'pikud':
        with tabs[6]:
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
                        success, message = update_unit_password(selected_unit_pwd, new_pwd)
                        if success:
                            st.success(f"✅ {message} עבור {selected_unit_pwd}")
                            time.sleep(1)
                            st.rerun()
                        else:
                            st.error(f"❌ {message}")
                            st.info("💡 **אפשרויות פתרון:**\n- ודא שהטבלה `unit_passwords` קיימת ב-Supabase\n- בדוק שיש לך הרשאות כתיבה\n- נסה שוב או צור קשר עם התמיכה")
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

def create_enhanced_excel_report(df, unit_name=""):
    """
    🔧 יצירת קובץ Excel משופר עם עיצוב וסינון
    """
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        return create_full_report_excel(df)  # חזרה לפונקציה הרגילה אם אין openpyxl
        
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # --- גיליון 1: סיכום מנהלים ---
        summary_data = {
            'מדד': [
                'שם היחידה',
                'סה"כ דוחות',
                'מספר מבקרים',
                'מספר מוצבים',
                'תאריך ראשון',
                'תאריך אחרון',
                'נוצר בתאריך'
            ],
            'ערך': [
                unit_name,
                len(df),
                df['inspector'].nunique() if 'inspector' in df.columns else 0,
                df['base'].nunique() if 'base' in df.columns else 0,
                df['date'].min().strftime('%d/%m/%Y') if not df.empty and 'date' in df.columns else '-',
                df['date'].max().strftime('%d/%m/%Y') if not df.empty and 'date' in df.columns else '-',
                datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='סיכום', index=False)
        
        # עיצוב גיליון סיכום
        ws_summary = writer.sheets['סיכום']
        for cell in ws_summary[1]:
            cell.font = Font(bold=True, size=12, color="FFFFFF")
            cell.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
            cell.alignment = Alignment(horizontal="right")
        
        # --- גיליון 2: נתונים מפורטים ---
        column_mapping = {
            'date': 'תאריך', 'time': 'שעה', 'base': 'מוצב', 'inspector': 'מבקר',
            'unit': 'יחידה', 'k_cert': 'תעודת כשרות', 'k_cook_type': 'סוג מטבח',
            'k_shabbat_supervisor': 'נאמן כשרות בשבת', 'k_shabbat_supervisor_name': 'שם נאמן',
            'k_shabbat_supervisor_phone': 'טלפון נאמן', 'k_issues': 'תקלות כשרות',
            'k_issues_description': 'פירוט תקלות', 't_private': 'טרקלין - כלים פרטיים',
            't_kitchen_tools': 'טרקלין - כלי מטבח', 't_procedure': 'טרקלין - נוהל סגירה',
            't_friday': 'טרקלין - כלים סגורים בשבת', 'w_location': 'ויקוק - מיקום',
            'w_private': 'ויקוק - כלים פרטיים', 'soldier_want_lesson': 'רצון לשיעור תורה',
            'soldier_has_lesson': 'יש שיעור במוצב', 'soldier_lesson_teacher': 'מעביר שיעור',
            'soldier_lesson_phone': 'טלפון מעביר', 'p_mix': 'ערבוב כלים',
            'e_status': 'סטטוס עירוב', 'r_mezuzot_missing': 'מזוזות חסרות',
            's_clean': 'ניקיון בית כנסת', 'missing_items': 'חוסרים', 'free_text': 'הערות'
        }
        
        existing_cols = [col for col in column_mapping.keys() if col in df.columns]
        if existing_cols:
            details_df = df[existing_cols].copy()
            details_df.rename(columns=column_mapping, inplace=True)
            details_df.to_excel(writer, sheet_name='נתונים מפורטים', index=False)
            
            # עיצוב גיליון נתונים
            ws_details = writer.sheets['נתונים מפורטים']
            for cell in ws_details[1]:
                cell.font = Font(bold=True, size=11, color="FFFFFF")
                cell.fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
                cell.alignment = Alignment(horizontal="right")
            
            # הוספת גבולות
            thin_border = Border(
                left=Side(style='thin'), right=Side(style='thin'),
                top=Side(style='thin'), bottom=Side(style='thin')
            )
            for row in ws_details.iter_rows(min_row=1, max_row=ws_details.max_row):
                for cell in row:
                    cell.border = thin_border
                    cell.alignment = Alignment(horizontal="right")
    
    return output.getvalue()

def render_unit_report():
    """הטופס המלא"""
    unit = st.session_state.selected_unit
    
    # ✅ ניקוי cache בכל טעינה כדי למנוע שגיאות schema
    clear_cache()
    """הטופס המלא"""
    unit = st.session_state.selected_unit
    
    # כפתור קוד גישה לרב חטמ"ר
    st.markdown("---")
    st.markdown("### 🔑 כניסה לניתוח יחידה מפורט (רב חטמ\"ר)")
    
    # בדיקה אם כבר מחובר כמפקד
    if 'commander_authenticated' not in st.session_state:
        st.session_state.commander_authenticated = False
    
    if not st.session_state.commander_authenticated:
        st.info("הזן את קוד הגישה האישי שלך כדי לצפות בניתוח מפורט של היחידה")
        
        col1, col2 = st.columns([3, 1])
        with col1:
            access_code = st.text_input("קוד גישה", type="password", key="commander_code_input")
        with col2:
            st.write("")  # spacing
            st.write("")  # spacing
            if st.button("🔓 כניסה", use_container_width=True):
                # בדיקת קוד גישה
                if unit in COMMANDER_CODES and access_code == COMMANDER_CODES[unit]:
                    st.session_state.commander_authenticated = True
                    st.session_state.commander_unit = unit
                    st.success("✅ קוד גישה נכון! מעביר לניתוח יחידה...")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error(f"❌ קוד גישה שגוי")
                    # Debug info
                    if unit in COMMANDER_CODES:
                        st.info(f"💡 רמז: הקוד הנכון מתחיל ב-'{COMMANDER_CODES[unit][:3]}...'")
                    else:
                        st.warning(f"⚠️ לא נמצא קוד עבור {unit}")
    else:
        # מפקד מחובר - הצג ניתוח יחידה
        st.success(f"✅ מחובר כרב חטמ\"ר - {unit}")
        
        col1, col2 = st.columns([1, 4])
        with col1:
            if st.button("🔙 חזרה לדשבורד", use_container_width=True):
                st.session_state.commander_authenticated = False
                st.rerun()
        
        # הצגת ניתוח יחידה (העתקה מטאב 4 של פיקוד)
        st.markdown("---")
        st.markdown(f"## 📊 ניתוח מפורט - {unit}")
        
        # כפתור הורדה בולט לניתוח המפורט
        try:
             # טעינה זריזה לצורך הכפתור (או שנשתמש בנתונים שיטענו בהמשך)
             # עדיף להשתמש ב-unit_df שנטען, אבל נצטרך לחכות לטעינה.
             # אז נכניס את הכפתור אחרי הטעינה.
             pass
        except:
             pass
        
        # טעינת נתונים
        try:
            all_reports = load_reports_cached()
            df = pd.DataFrame(all_reports) if all_reports else pd.DataFrame()
        except Exception as e:
            st.error(f"שגיאה בטעינת נתונים: {e}")
            df = pd.DataFrame()
        
        # סינון דוחות ליחידה זו בלבד
        if not df.empty and 'unit' in df.columns:
            unit_df = df[df['unit'] == unit].copy()
        else:
            unit_df = pd.DataFrame()
            
        if unit_df.empty:
            st.warning(f"⚠️ לא נמצאו דוחות עבור {unit}")
            st.info("💡 ברגע שיהיו דוחות, הניתוח המפורט יופיע כאן")
        else:
            # כפתור הורדה בולט (אחרי שיש נתונים)
            enhanced_excel = create_enhanced_excel_report(unit_df, unit_name=unit)
            if enhanced_excel:
                st.download_button(
                    label="📥 הורד דוח מפורט משופר (Excel)",
                    data=enhanced_excel,
                    file_name=f"detailed_report_{unit}_{pd.Timestamp.now().strftime('%Y%m')}.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True,
                    key="dl_detailed_internal",
                    type="primary"
                )
            
            # טאבים לניתוח
            analysis_tabs = st.tabs(["🔴 חוסרים ובעיות", "🍴 עירוב וכשרות", "🏗️ תשתיות ויומן ביקורת", "📊 סיכום כללי", "🛰️ מפה ארצית"])
            
            latest_report = unit_df.sort_values('date', ascending=False).iloc[0] if len(unit_df) > 0 else None
            
            with analysis_tabs[0]:  # חוסרים
                st.markdown("#### חוסרים שדווחו")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    mezuzot_missing = int(latest_report.get('r_mezuzot_missing', 0)) if latest_report is not None else 0
                    if mezuzot_missing > 0:
                        st.warning(f"📜 **מזוזות חסרות:** {mezuzot_missing}")
                    else:
                        st.success("✅ **מזוזות:** תקין")
                    
                    # These keys (r_torah_missing, r_tzitzit_missing, r_tefillin_missing)
                    # are not present in the original form data.
                    # They might be expected from a different data source or a future form update.
                    # For now, I'll keep them as they are in the provided snippet.
                    torah_missing = int(latest_report.get('r_torah_missing', 0)) if latest_report is not None else 0
                    if torah_missing > 0:
                        st.warning(f"📖 **ספרי תורה חסרים:** {torah_missing}")
                    else:
                        st.success("✅ **ספרי תורה:** תקין")
                
                with col2:
                    tzitzit_missing = int(latest_report.get('r_tzitzit_missing', 0)) if latest_report is not None else 0
                    if tzitzit_missing > 0:
                        st.warning(f"🧵 **ציציות חסרות:** {tzitzit_missing}")
                    else:
                        st.success("✅ **ציציות:** תקין")
                    
                    tefillin_missing = int(latest_report.get('r_tefillin_missing', 0)) if latest_report is not None else 0
                    if tefillin_missing > 0:
                        st.warning(f"📿 **תפילין חסרים:** {tefillin_missing}")
                    else:
                        st.success("✅ **תפילין:** תקין")
            
            with analysis_tabs[1]:  # עירוב וכשרות
                st.markdown("#### מצב עירוב וכשרות")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    eruv_status = latest_report.get('e_status', 'לא ידוע') if latest_report is not None else 'לא ידוע'
                    if eruv_status == 'תקין':
                        st.success("✅ **עירוב:** תקין")
                    else:
                        st.error("🚧 **עירוב:** פסול")
                    
                    # 'k_eruv_kelim' is not in the original form data.
                    eruv_kelim = latest_report.get('k_eruv_kelim', 'לא') if latest_report is not None else 'לא'
                    if eruv_kelim == 'כן':
                        st.error("🔴 **עירוב כלים:** קיים")
                    else:
                        st.success("✅ **עירוב כלים:** לא קיים")
                
                with col2:
                    k_cert = latest_report.get('k_cert', 'לא') if latest_report is not None else 'לא'
                    if k_cert == 'כן':
                        st.success("✅ **תעודת כשרות:** קיימת")
                    else:
                        st.warning("⚠️ **תעודת כשרות:** חסרה")
                    
                    # 's_traklin_closed' is not in the original form data.
                    traklin_closed = latest_report.get('s_traklin_closed', 'לא') if latest_report is not None else 'לא'
                    if traklin_closed == 'כן':
                        st.success("✅ **סגירת טרקלין:** מבוצעת")
                    else:
                        st.warning("⚠️ **סגירת טרקלין:** לא מבוצעת")
            
            with analysis_tabs[2]:  # תשתיות
                st.markdown("#### תשתיות ויומן ביקורת")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    # 'k_pikubok' is not in the original form data.
                    pikubok = latest_report.get('k_pikubok', 'לא') if latest_report is not None else 'לא'
                    if pikubok == 'כן':
                        st.success("✅ **יומן ביקורת:** קיים")
                    else:
                        st.warning("⚠️ **יומן ביקורת:** לא קיים")
                    
                    # 'k_streams' is not in the original form data.
                    procedures = latest_report.get('k_streams', 'לא') if latest_report is not None else 'לא'
                    if procedures == 'כן':
                        st.info("📋 **נהלים מעודכנים:** קיימים")
                    else:
                        st.warning("⚠️ **נהלים מעודכנים:** לא קיימים")
            
            with analysis_tabs[3]:  # סיכום
                st.markdown("#### סיכום כללי")
                
                # חישוב אחוז תקינות
                total_checks = 9
                passed_checks = 0
                
                if mezuzot_missing == 0: passed_checks += 1
                if torah_missing == 0: passed_checks += 1
                if tzitzit_missing == 0: passed_checks += 1
                if tefillin_missing == 0: passed_checks += 1
                if eruv_status == 'תקין': passed_checks += 1
                if eruv_kelim == 'לא': passed_checks += 1
                if k_cert == 'כן': passed_checks += 1
                if traklin_closed == 'כן': passed_checks += 1
                if pikubok == 'כן': passed_checks += 1
                
                compliance_pct = (passed_checks / total_checks) * 100
                
                st.metric("📊 אחוז תקינות כללי", f"{compliance_pct:.0f}%")
                st.progress(compliance_pct / 100)
                
                if compliance_pct >= 90:
                    st.success("🌟 **מצוין!** היחידה במצב תקין מעולה")
                elif compliance_pct >= 70:
                    st.info("👍 **טוב!** היחידה במצב סביר, יש מקום לשיפור")
                else:
                    st.warning("⚠️ **דורש תשומת לב!** יש נושאים שדורשים טיפול")
            
            with analysis_tabs[4]: # מפה ארצית
                st.markdown("#### 🛰️ מפה ארצית מלאה")
                
                # טעינת כל הנתונים ללא סינון
                unit_map_raw = load_reports_cached(None) 
                unit_map_df = pd.DataFrame(unit_map_raw) if unit_map_raw else pd.DataFrame()
                
                if not unit_map_df.empty:
                    v_unit_map = unit_map_df.dropna(subset=['latitude', 'longitude']).copy()
                    # ביטול סינונים - מציג את כל הארץ
                    v_unit_map = v_unit_map[(v_unit_map['latitude'] > 29) & (v_unit_map['latitude'] < 34)]
                    
                    # מיפוי צבעים
                    unit_color_map = {
                        "חטמ״ר בנימין": "#1e3a8a",
                        "חטמ״ר שומרון": "#60a5fa",
                        "חטמ״ר יהודה": "#22c55e",
                        "חטמ״ר עציון": "#fb923c",
                        "חטמ״ר אפרים": "#ef4444",
                        "חטמ״ר מנשה": "#a855f7",
                        "חטמ״ר הבקעה": "#db2777"
                    }
                    
                    m_unit = create_street_level_map(center=(31.7, 35.2), zoom_start=8)
                    for _, row in v_unit_map.iterrows():
                        add_unit_marker_to_folium(m_unit, row, unit_color_map)
                        
                    st_folium(m_unit, width=1200, height=500, key="hatmar_global_map", returned_objects=[])
                else:
                    st.warning("לא נמצאו נתונים למפה")
        
        st.markdown("---")

        # ===== טבלה מורחבת עם כל העמודות החדשות - נוסף עבור רבני חטמ״ר =====
        st.markdown("#### 📋 דוחות מפורטים - תצוגה מלאה")
        
        # בניית רשימת עמודות בסדר לוגי
        base_columns = ['date', 'base', 'inspector']
        
        # עמודות מצב בסיסיות
        status_columns = []
        if 'e_status' in unit_df.columns:
            status_columns.append('e_status')
        if 'k_cert' in unit_df.columns:
            status_columns.append('k_cert')
        
        # 🆕 עמודות תקלות כשרות (הכל!)
        kashrut_issues_columns = []
        if 'k_issues' in unit_df.columns:
            kashrut_issues_columns.append('k_issues')
        if 'k_issues_description' in unit_df.columns:
            kashrut_issues_columns.append('k_issues_description')
        if 'k_separation' in unit_df.columns:
            kashrut_issues_columns.append('k_separation')
        if 'p_mix' in unit_df.columns:
            kashrut_issues_columns.append('p_mix')
        if 'k_products' in unit_df.columns:
            kashrut_issues_columns.append('k_products')
        if 'k_bishul' in unit_df.columns:
            kashrut_issues_columns.append('k_bishul')
        
        # 🆕 עמודות שיעורי תורה (הכל!)
        torah_columns = []
        if 'soldier_want_lesson' in unit_df.columns:
            torah_columns.append('soldier_want_lesson')
        if 'soldier_has_lesson' in unit_df.columns:
            torah_columns.append('soldier_has_lesson')
        if 'soldier_lesson_teacher' in unit_df.columns:
            torah_columns.append('soldier_lesson_teacher')
        if 'soldier_lesson_phone' in unit_df.columns:
            torah_columns.append('soldier_lesson_phone')
        if 'soldier_yeshiva' in unit_df.columns:
            torah_columns.append('soldier_yeshiva')
        
        # 🆕 עמודות חוסרים ונוספות
        other_columns = []
        if 'r_mezuzot_missing' in unit_df.columns:
            other_columns.append('r_mezuzot_missing')
        if 'missing_items' in unit_df.columns:
            other_columns.append('missing_items')
        if 'free_text' in unit_df.columns:
            other_columns.append('free_text')
        
        # איחוד כל העמודות
        all_columns = base_columns + status_columns + kashrut_issues_columns + torah_columns + other_columns
        
        # סינון רק עמודות קיימות
        available_columns = [col for col in all_columns if col in unit_df.columns]
        
        # יצירת DataFrame לתצוגה
        if available_columns:
            display_df = unit_df[available_columns].copy()
            
            # 🆕 מיפוי שמות עמודות לעברית - מלא ומפורט
            column_mapping = {
                # בסיסי
                'date': 'תאריך',
                'base': 'מוצב',
                'inspector': 'מבקר',
                
                # מצב
                'e_status': 'סטטוס עירוב',
                'k_cert': 'תעודת כשרות',
                
                # תקלות כשרות
                'k_issues': '❗ יש תקלות כשרות?',
                'k_issues_description': '📝 פירוט תקלות כשרות',
                'k_separation': 'הפרדת כלים',
                'p_mix': '🔴 ערבוב כלים',
                'k_products': 'רכש חוץ לא מאושר',
                'k_bishul': 'בישול ישראל',
                
                # שיעורי תורה
                'soldier_want_lesson': '💡 רצון לשיעור תורה',
                'soldier_has_lesson': '📚 יש שיעור במוצב?',
                'soldier_lesson_teacher': '👨‍🏫 שם מעביר השיעור',
                'soldier_lesson_phone': '📞 טלפון מעביר השיעור',
                'soldier_yeshiva': 'ימי ישיבה',
                
                # חוסרים ונוספים
                'r_mezuzot_missing': '📜 מזוזות חסרות',
                'missing_items': '⚠️ חוסרים כלליים',
                'free_text': '📝 הערות נוספות'
            }
            
            # החלפת שמות העמודות
            display_df.columns = [column_mapping.get(col, col) for col in display_df.columns]
            
            # הצגת הטבלה
            st.dataframe(
                display_df,
                use_container_width=True,
                hide_index=True,
                height=400
            )
        else:
            st.warning("לא נמצאו עמודות להצגה")
            
        # 🆕 כפתור הורדה חובה - למובייל ומחשב
        st.markdown("---")
        st.markdown("### 📥 הורדת דוח Excel מלא")
        
        # הכנת הקובץ מראש
        excel_file_hatmar = None
        if not unit_df.empty:
            try:
                excel_file_hatmar = create_full_report_excel(unit_df)
            except Exception as e:
                st.error(f"שגיאה ביצירת Excel: {e}")
        
        # הצגת הכפתור
        if excel_file_hatmar:
            st.download_button(
                label="⬇️ לחץ להורדת כל הנתונים (Excel)",
                data=excel_file_hatmar,
                file_name=f"דוח_מלא_{unit}_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True,
                type="primary",
                key=f"dl_excel_hatmar_{pd.Timestamp.now().strftime('%H%M%S')}"
            )
            st.caption("📊 הקובץ כולל את כל השאלות והתשובות מהשאלון")
        else:
            st.error("❌ לא ניתן ליצור קובץ Excel")
    
    # טופס דיווח (רק אם לא במצב מפקד)
    if not st.session_state.commander_authenticated:
        st.markdown("### 📋 דיווח ביקורת חדש")
        
        # כפתור יציאה בראש הדף
        col_logout, col_logo, col_title = st.columns([1, 1, 6])
        with col_logout:
            if st.button("🚪 יציאה", key="logout_hatmar", use_container_width=True):
                st.session_state.logged_in = False
                st.session_state.selected_unit = None
                st.session_state.login_stage = "gallery"  # חזרה לגלריה הראשית
                st.rerun()
        with col_logo:
            st.image(get_logo_url(unit), width=80)
        with col_title:
            st.title(f"📋 דיווח ביקורת - {unit}")
    
    with st.form("report"):
        st.markdown("### 📍 מיקום ותאריך")
        loc = streamlit_geolocation()
        gps_lat, gps_lon = (loc['latitude'], loc['longitude']) if loc and loc.get('latitude') else (None, None)
        
        if gps_lat:
            # ✅ הצגת המיקום המדויק שנקלט
            st.success(f"✅ מיקום GPS נקלט: {gps_lat:.6f}, {gps_lon:.6f}")
            
            # ✅ הדפסה ללוג (תוכל לראות בקונסול של Streamlit)
            print(f"🔍 DEBUG - GPS נקלט: lat={gps_lat}, lon={gps_lon}, base={base if 'base' in locals() else 'לא הוגדר'}")
            
            # ✅ בדיקה אם המיקום בגבולות ישראל
            if not (29.5 <= gps_lat <= 33.5 and 34.2 <= gps_lon <= 35.9):
                st.error(f"🚨 **שגיאה:** המיקום ({gps_lat:.4f}, {gps_lon:.4f}) מחוץ לגבולות ישראל!")
                st.warning("💡 ייתכן שהמכשיר שלך נותן מיקום שגוי. נסה להפעיל מחדש את ה-GPS")
                st.info("📍 **למידע:** ירושלים היא בערך lat=31.7683, lon=35.2137")
            else:
                st.info(f"✅ המיקום תקין - בגבולות ישראל")
            
            # בדיקת מרחק מבסיסים ידועים
            nearest_base, distance = find_nearest_base(gps_lat, gps_lon)
            
            if distance < 2.0:
                st.info(f"📍 **מיקום מזוהה:** {nearest_base} ({distance:.1f} ק\"מ)")
            elif distance < 5.0:
                st.warning(f"⚠️ **מרחק בינוני:** {nearest_base} ({distance:.1f} ק\"מ) - וודא שהמיקום נכון")
            else:
                st.error(f"🚨 **התראה:** {distance:.1f} ק\"מ מ-{nearest_base} - מיקום חריג!")
        else:
            st.warning("📡 מחפש מיקום GPS... אנא המתן עד להופעת אישור ירוק לפני השליחה")
            st.caption("ירושלים: lat ~31.7, lon ~35.2")
        
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
        
        # שאלות חדשות עם תמונות
        st.markdown("#### 📸 תקלות ונאמן כשרות")
        c1, c2 = st.columns(2)
        k_issues = c1.radio("יש תקלות כשרות?", ["כן", "לא"], horizontal=True, key="k_issues")
        k_shabbat_supervisor = c2.radio("יש נאמן כשרות בשבת?", ["כן", "לא"], horizontal=True, key="k_shabbat_sup")
        
        # 🆕 פירוט תקלות (אם יש)
        k_issues_description = ""
        if k_issues == "כן":
            k_issues_description = c1.text_area("פרט את תקלות הכשרות שנמצאו", key="k_issues_desc")
            
        # 🆕 פרטי נאמן כשרות (אם יש)
        k_shabbat_supervisor_name = ""
        k_shabbat_supervisor_phone = ""
        if k_shabbat_supervisor == "כן":
            with c2:
                col_sup_name, col_sup_phone = st.columns(2)
                k_shabbat_supervisor_name = col_sup_name.text_input("שם נאמן כשרות", key="k_sup_name")
                k_shabbat_supervisor_phone = col_sup_phone.text_input("טלפון נאמן", key="k_sup_phone")
        
        # תמונות לתקלות ונאמן
        c1, c2 = st.columns(2)
        k_issues_photo = c1.file_uploader("📷 תמונת תקלה (אם יש)", type=['jpg', 'png', 'jpeg'], key="k_issues_photo")
        
        # הודעה דינמית לפי יום בשבוע
        current_day = datetime.datetime.now().weekday()
        if current_day in [3, 4]:  # חמישי ושישי
            k_shabbat_photo = c2.file_uploader("📷 תמונת נאמן כשרות ⚠️ (חובה בחמישי-שישי)", type=['jpg', 'png', 'jpeg'], key="k_shabbat_photo", help="בימי חמישי ושישי חובה להעלות תמונה של נאמן הכשרות")
        else:
            k_shabbat_photo = c2.file_uploader("📷 תמונת נאמן כשרות (אופציונלי)", type=['jpg', 'png', 'jpeg'], key="k_shabbat_photo")
        
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
        
        # 🆕 שאלה חדשה - רצון לשיעור תורה
        soldier_want_lesson = c2.radio("האם יש רצון לשיעור תורה?", ["כן", "לא"], horizontal=True, key="so_want_lesson")
        
        # 🆕 שאלה חדשה - שיעור תורה קיים
        c1, c2 = st.columns(2)
        soldier_has_lesson = c1.radio("יש שיעור תורה במוצב?", ["כן", "לא"], horizontal=True, key="so_has_lesson")
        
        # 🆕 אם יש שיעור - שדות נוספים
        soldier_lesson_teacher = ""
        soldier_lesson_phone = ""
        
        if soldier_has_lesson == "כן":
            col_teacher, col_phone = st.columns(2)
            with col_teacher:
                soldier_lesson_teacher = st.text_input("שם מעביר השיעור", key="so_lesson_teacher", 
                                                       placeholder="לדוגמה: הרב כהן")
            with col_phone:
                soldier_lesson_phone = st.text_input("טלפון מעביר השיעור", key="so_lesson_phone",
                                                     placeholder="לדוגמה: 050-1234567")
        
        # שאלות קיימות
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
            # בדיקת יום בשבוע - חמישי (3) ושישי (4) ב-Python weekday
            current_weekday = datetime.datetime.now().weekday()
            is_thursday_or_friday = current_weekday in [3, 4]
            
            # בדיקת חובת תמונת נאמן כשרות בחמישי-שישי
            if is_thursday_or_friday and k_shabbat_supervisor == "כן" and not k_shabbat_photo:
                st.error("⚠️ **חובה להעלות תמונת נאמן כשרות בימי חמישי ושישי!**")
                st.warning("💡 נא להעלות תמונה של נאמן הכשרות בשדה המתאים למעלה")
            elif base and inspector and photo:
                photo_url = upload_report_photo(photo.getvalue(), unit, base)
                
                # העלאת תמונות נוספות (תקלות כשרות ונאמן כשרות)
                k_issues_photo_url = None
                k_shabbat_photo_url = None
                
                if k_issues_photo:
                    k_issues_photo_url = upload_report_photo(k_issues_photo.getvalue(), unit, f"{base}_kashrut_issue")
                
                if k_shabbat_photo:
                    k_shabbat_photo_url = upload_report_photo(k_shabbat_photo.getvalue(), unit, f"{base}_shabbat_supervisor")
                
                data = {
                    "unit": st.session_state.selected_unit, "date": datetime.datetime.now().isoformat(),
                    "base": base, "inspector": inspector, "photo_url": photo_url,
                    "k_cert": k_cert, "k_dates": k_dates,
                    "e_status": e_status,
                    "s_clean": s_clean,
                    "t_private": t_private, "t_kitchen_tools": t_kitchen_tools, "t_procedure": t_procedure,
                    "t_friday": t_friday, "t_app": t_app, "w_location": w_location, "w_private": w_private,
                    "w_kitchen_tools": w_kitchen_tools, "w_procedure": w_procedure, "w_guidelines": w_guidelines,
                    "w_kitchen_tools": w_kitchen_tools, "w_procedure": w_procedure, "w_guidelines": w_guidelines,
                    "soldier_yeshiva": soldier_yeshiva,
                    "soldier_want_lesson": soldier_want_lesson,  # 🆕
                    "soldier_has_lesson": soldier_has_lesson,    # 🆕
                    "soldier_lesson_teacher": soldier_lesson_teacher,  # 🆕
                    "soldier_lesson_phone": soldier_lesson_phone,      # 🆕
                    "soldier_food": soldier_food,
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
                    "k_eggs": k_eggs, "k_machshir": k_machshir, "k_heater": k_heater, "k_app": k_app,
                    # שדות חדשים
                    # שדות חדשים
                    "k_issues": k_issues,
                    "k_issues_description": k_issues_description,  # 🆕
                    "k_shabbat_supervisor": k_shabbat_supervisor,
                    "k_shabbat_supervisor_name": k_shabbat_supervisor_name,    # 🆕
                    "k_shabbat_supervisor_phone": k_shabbat_supervisor_phone,  # 🆕
                    "k_issues_photo_url": k_issues_photo_url,
                    "k_shabbat_photo_url": k_shabbat_photo_url
                }
                
                # הוספת מיקום רק אם קיים ואם הטבלה תומכת בזה
                # הוספת מיקום רק אם קיים ואם הטבלה תומכת בזה
                if gps_lat and gps_lon:
                    # ✅ בדיקה נוספת שהמיקום תקין
                    if 29.5 <= gps_lat <= 33.5 and 34.2 <= gps_lon <= 35.9:
                        # הוספת רעש למיקום GPS לצורכי אבטחה (~300 מטר)
                        # ✅ שימוש ב-secure_location_offset עם ID יציב
                        unique_id_for_offset = f"{unit}_{base}"
                        lat_with_offset, lon_with_offset = secure_location_offset(gps_lat, gps_lon, unique_id_for_offset, offset_meters=300)
                        data["latitude"] = lat_with_offset
                        data["longitude"] = lon_with_offset
                        
                        # ✅ הדפסה ללוג
                        print(f"💾 שומר למסד נתונים: lat={lat_with_offset:.6f}, lon={lon_with_offset:.6f}")
                    else:
                        st.warning("⚠️ המיקום לא נשמר כי הוא מחוץ לגבולות ישראל")
                
                try:
                    # ניסיון לשמור את הדוח
                    try:
                        result = supabase.table("reports").insert(data).execute()
                    except Exception as e:
                        # טיפול בשגיאה אם העמודות החדשות עדיין לא קיימות במסד הנתונים
                        if "PGRST204" in str(e) or "Could not find" in str(e):
                            # ניסיון חוזר ללא השדות החדשים (שמירה שקטה של בסיס הדוח)
                            # רשימת כל השדות החדשים שאולי חסרים
                            new_fields = [
                                "k_issues", "k_issues_description", "k_shabbat_supervisor", 
                                "k_shabbat_supervisor_name", "k_shabbat_supervisor_phone",
                                "k_issues_photo_url", "k_shabbat_photo_url",
                                "soldier_want_lesson", "soldier_has_lesson", "soldier_lesson_teacher", "soldier_lesson_phone"
                            ]
                            for field in new_fields:
                                data.pop(field, None)
                            result = supabase.table("reports").insert(data).execute()
                        else:
                            raise e
                    
                    # מעקב אוטומטי אחר חוסרים
                    if result.data and len(result.data) > 0:
                        report_id = result.data[0].get('id')
                        if report_id:
                            detect_and_track_deficits(data, report_id, unit)
                    
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
            
            # הוספת בלוק ציון ומדד (חדש!)
            st.markdown("---")
            st.markdown("### 🎖️ מדד כשירות יחידה וסיכום פעילות")
            
            unit_score = calculate_unit_score(unit_df)
            unit_badge, badge_color = get_unit_badge(unit_score)
            
            col_s1, col_s2, col_s3 = st.columns([1, 1, 2])
            with col_s1:
                st.metric("ציון משוקלל", f"{unit_score:.1f}/100")
            with col_s2:
                st.markdown(f"<div style='background:{badge_color}; color:white; padding:10px; border-radius:8px; text-align:center; font-weight:bold; margin-top: 5px;'>{unit_badge}</div>", unsafe_allow_html=True)
            with col_s3:
                # כפתור הורדה ראשי כאן
                full_report_data_main = create_full_report_excel(unit_df)
                if full_report_data_main:
                    st.download_button(
                        label="📥 הורד סיכום יחידה מלא (Excel)",
                        data=full_report_data_main,
                        file_name=f"full_unit_summary_{st.session_state.selected_unit}_{pd.Timestamp.now().strftime('%Y%m')}.xlsx",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        use_container_width=True,
                        key="dl_main_summary_unit"
                    )
            
            st.markdown("---")

            # כפתורי הורדה נוספים (ניתן להשאיר או להסיר, נשאיר כגיבוי)
            col_dl1, col_dl2 = st.columns(2)
            
            with col_dl1:
                excel_data = create_inspector_excel(unit_df)
                if excel_data:
                    st.download_button(
                        label="📄 דוח מבקרים (Excel)",
                        data=excel_data,
                        file_name=f"inspector_stats_{st.session_state.selected_unit}_{pd.Timestamp.now().strftime('%Y%m')}.xlsx",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        use_container_width=True,
                        key="dl_inspectors_top"
                    )
                    
            with col_dl2:
                full_report_data = create_full_report_excel(unit_df)
                if full_report_data:
                    st.download_button(
                        label="📊 דוח פעילות מלא (Excel)",
                        data=full_report_data,
                        file_name=f"full_activity_report_{st.session_state.selected_unit}_{pd.Timestamp.now().strftime('%Y%m')}.xlsx",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        use_container_width=True,
                        key="dl_full_report_top"
                    )
            
            st.markdown("---")

            # טאבים לסטטיסטיקות
            stats_tabs = st.tabs(["🏆 טבלת מובילים", "📍 מיקומים", "⏰ שעות פעילות", "📈 התקדמות"])
            
            # טאב 1: טבלת מובילים
            with stats_tabs[0]:
                st.markdown("### 🏆 9 המבקרים המובילים")
                
                if not stats['top_inspectors'].empty:
                    # יצירת טבלה מעוצבת - 9 הראשונים
                    leaderboard_data = []
                    number_emojis = {
                        1: "🥇", 2: "🥈", 3: "🥉",
                        4: "4️⃣", 5: "5️⃣", 6: "6️⃣",
                        7: "7️⃣", 8: "8️⃣", 9: "9️⃣"
                    }
                    
                    for idx, (inspector, count) in enumerate(stats['top_inspectors'].head(9).items(), 1):
                        medal = number_emojis.get(idx, f"#{idx}")
                        leaderboard_data.append({
                            "מקום": medal,
                            "שם המבקר": inspector,
                            "דוחות": count
                        })
                    
                    leaderboard_df = pd.DataFrame(leaderboard_data)
                    
                    # תצוגה משופרת עם עיצוב ממורכז
                    # שימוש ב-HTML לעיצוב מדליות ממורכזות
                    html_table = "<table style='width:100%; text-align:center; border-collapse: collapse; color: #000000;'>"
                    html_table += "<thead><tr style='background-color: #f0f2f6;'>"
                    html_table += "<th style='padding: 12px; font-size: 16px; color: #000000;'>מקום</th>"
                    html_table += "<th style='padding: 12px; font-size: 16px; color: #000000;'>שם המבקר</th>"
                    html_table += "<th style='padding: 12px; font-size: 16px; color: #000000;'>דוחות</th>"
                    html_table += "</tr></thead><tbody>"
                    
                    for _, row in leaderboard_df.iterrows():
                        html_table += "<tr style='border-bottom: 1px solid #e0e0e0;'>"
                        html_table += f"<td style='padding: 10px; font-size: 24px; color: #000000;'>{row['מקום']}</td>"
                        html_table += f"<td style='padding: 10px; text-align: right; font-size: 16px; color: #000000;'>{row['שם המבקר']}</td>"
                        html_table += f"<td style='padding: 10px; font-size: 16px; color: #000000;'>{row['דוחות']}</td>"
                        html_table += "</tr>"
                    
                    html_table += "</tbody></table>"
                    st.markdown(html_table, unsafe_allow_html=True)
                    

                else:
                    st.info("אין נתונים זמינים")
            
            # טאב 2: מיקומים

            with stats_tabs[1]:
                st.markdown("### 📍 מפת מיקומים")
                st.info("🔐 **ביטחון מידע:** המיקומים מוזזים 300 מטר מהמיקום המדויק לצורכי אבטחת מידע")
                
                # בדיקה אם יש עמודות מיקום
                has_location_columns = not unit_df.empty and 'latitude' in unit_df.columns and 'longitude' in unit_df.columns
                
                if has_location_columns:
                    # ניקוי נתונים ריקים
                    valid_map = unit_df.dropna(subset=['latitude', 'longitude']).copy()
                    
                    if not valid_map.empty:
                        # מיפוי צבעים לפי יחידה (Folium format)
                        unit_color_map = {
                            "חטמ״ר בנימין": "#1e3a8a",
                            "חטמ״ר שומרון": "#60a5fa",
                            "חטמ״ר יהודה": "#22c55e",
                            "חטמ״ר עציון": "#fb923c",
                            "חטמ״ר אפרים": "#ef4444",
                            "חטמ״ר מנשה": "#a855f7",
                            "חטמ״ר הבקעה": "#db2777"
                        }
                        
                        # חישוב מרכז המפה
                        center_lat = valid_map['latitude'].mean()
                        center_lon = valid_map['longitude'].mean()
                        
                        # יצירת מפת Folium
                        m = create_street_level_map(center=(center_lat, center_lon), zoom_start=13)
                        
                        # הוספת כל הנקודות למפה
                        for _, row in valid_map.iterrows():
                            add_unit_marker_to_folium(m, row, unit_color_map)
                        
                        # הצגת המפה
                        st_folium(m, width=1200, height=500, returned_objects=[], key=f"map_hatmar_{unit}")
                        
                        # מקרא
                        st.markdown("#### 🔑 מקרא")
                        legend_html = "<div style='display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;'>"
                        
                        # מקרא ייחודי ליחידה הנוכחית או כללי אם יש ערבוב
                        unique_units = sorted(valid_map['unit'].unique()) if 'unit' in valid_map.columns else [unit]
                        
                        for u in unique_units:
                            color = unit_color_map.get(u, "#808080")
                            legend_html += f"<div><span style='color: {color}; font-size: 1.5rem;'>●</span> {u}</div>"
                        legend_html += "</div>"
                        st.markdown(legend_html, unsafe_allow_html=True)
                        
                        st.success("✅ **מפה ברמת רחוב** - זום עד 20 | שמות רחובות בעברית | שכבות: רחובות + לווין")
                        st.info("💡 **נקודות גדולות** = בעיות (עירוב פסול או כשרות לא תקינה)")
                        
                    else:
                        st.info("אין נתונים עם מיקום GPS תקין להצגה.")
                else:
                    st.warning("⚠️ לא נמצאו נתוני מיקום (GPS) בדוחות היחידה.")
            
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
                        xaxis_tickangle=-45,
                        paper_bgcolor='white',
                        plot_bgcolor='white',
                        font=dict(color='#1e293b')
                    )
                    
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # פירוט מפורט של שעות פעילות
                    st.markdown("#### 📊 פירוט שעות פעילות")
                    
                    # יצירת DataFrame עם כל 24 השעות
                    all_hours = pd.DataFrame({'hour': range(24), 'count': 0})
                    activity_hours = stats['peak_hours'].reset_index()
                    activity_hours.columns = ['hour', 'count']
                    
                    # מיזוג עם כל השעות
                    hourly_data = all_hours.set_index('hour').combine_first(activity_hours.set_index('hour')).reset_index()
                    hourly_data = hourly_data.sort_values('hour')
                    
                    # הצגת גרף עמודות מפורט
                    fig_detailed = px.bar(
                        hourly_data,
                        x='hour',
                        y='count',
                        labels={'hour': 'שעה', 'count': 'מספר דוחות'},
                        title='התפלגות דוחות לפי שעה (24 שעות)',
                        color='count',
                        color_continuous_scale='Blues'
                    )
                    
                    fig_detailed.update_layout(
                        xaxis=dict(
                            tickmode='linear',
                            tick0=0,
                            dtick=1,
                            tickformat='%02d:00'
                        ),
                        showlegend=False,
                        height=400,
                        paper_bgcolor='white',
                        plot_bgcolor='white',
                        font=dict(color='#1e293b')
                    )
                    
                    st.plotly_chart(fig_detailed, use_container_width=True)
                    
                    # סטטיסטיקות מפורטות
                    active_hours = hourly_data[hourly_data['count'] > 0]
                    if len(active_hours) > 0:
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            peak_hour = active_hours.loc[active_hours['count'].idxmax(), 'hour']
                            peak_count = active_hours['count'].max()
                            st.metric("🔥 שעת שיא", f"{int(peak_hour):02d}:00", f"{int(peak_count)} דוחות")
                        with col2:
                            total_active_hours = len(active_hours)
                            st.metric("⏰ שעות פעילות", f"{total_active_hours} שעות")
                        with col3:
                            avg_per_active_hour = active_hours['count'].mean()
                            st.metric("📊 ממוצע לשעה פעילה", f"{avg_per_active_hour:.1f}")
                        
                        # רשימת שעות פעילות
                        st.markdown("**שעות עם דיווחים:**")
                        hours_list = ", ".join([f"{int(h):02d}:00 ({int(c)} דוחות)" for h, c in zip(active_hours['hour'], active_hours['count'])])
                        st.caption(hours_list)
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
    # החלת עיצוב CSS גלובלי
    apply_custom_css()
    
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
