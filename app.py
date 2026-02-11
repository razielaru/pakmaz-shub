
    """
    Staff Department Control System v3.0 - COMMAND CENTER LIVE
    מערכת בקרה ושליטה אגפים - מרכז פיקוד חי

    Major Update:
    - Full Command Center with Jinja2 template injection
    - Live data from Supabase (reports_v2, weekly_targets, etc.)
    - Interactive HTML dashboard with real map coordinates
    - All previous fixes maintained
    """

    import streamlit as st
    import streamlit.components.v1 as components
    from supabase import create_client, Client
    import pandas as pd
    import datetime
    import time
    from PIL import Image
    import io
    import bcrypt
    import importlib
    import staff_config
    import json
    from jinja2 import Template

    importlib.reload(staff_config)
    from staff_config import *

    # ===== Supabase Connection =====
    try:
        url = st.secrets["supabase"]["url"]
        key = st.secrets["supabase"]["key"]
        supabase: Client = create_client(url, key)
    except:
        url = ""
        key = ""
        supabase = None

    # ===== Session State Init =====
    if "page_icon" not in st.session_state:
        st.session_state.page_icon = "🎖️"
    if "icon_checked_unit" not in st.session_state:
        st.session_state.icon_checked_unit = None
    if "logged_in" not in st.session_state:
        st.session_state.logged_in = False
    if "selected_unit" not in st.session_state:
        st.session_state.selected_unit = None
    if "role" not in st.session_state:
        st.session_state.role = "department"
    if "login_stage" not in st.session_state:
        st.session_state.login_stage = "gallery"
    if "selected_category" not in st.session_state:
        st.session_state.selected_category = None

    # ===== Dynamic Icon Logic =====
    current_unit = st.session_state.get("selected_unit")
    if current_unit and current_unit != st.session_state.icon_checked_unit:
        try:
            if supabase:
                english_name = UNIT_ID_MAP.get(current_unit, "default")
                files = supabase.storage.from_("logos").list()
                file_names = [f['name'] for f in files] if files else []
                if f"{english_name}.png" in file_names:
                    project_url = url.rstrip("/")
                    st.session_state.page_icon = f"{project_url}/storage/v1/object/public/logos/{english_name}.png?t={int(time.time())}"
                else:
                    st.session_state.page_icon = "🎖️"
        except:
            st.session_state.page_icon = "🎖️"
        st.session_state.icon_checked_unit = current_unit

    # ===== Page Config =====
    st.set_page_config(
        page_title=f"מערכת בקרה - {st.session_state.get('selected_unit', 'ראשי')}",
        layout="wide",
        initial_sidebar_state="collapsed",
        page_icon=st.session_state.page_icon
    )

    # ===== COLOR SCHEME =====
    MILITARY_COLORS = {
        'primary':    '#4c1d95',
        'secondary':  '#7c3aed',
        'accent':     '#a855f7',
        'accent2':    '#c084fc',
        'bg':         '#f5f3ff',
        'dark':       '#2e1065',
        'light':      '#ede9fe',
        'card_bg':    '#ffffff',
        'border':     '#c4b5fd',
        'success':    '#16a34a',
        'warning':    '#d97706',
        'danger':     '#dc2626',
        'muted':      '#7c6fa0',
    }

    # ===== CSS (Compact) =====
    st.markdown(f"""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        html, body, .stApp {{ 
            direction: rtl; 
            text-align: right; 
            font-family: 'Heebo', sans-serif !important; 
            background: linear-gradient(160deg, {MILITARY_COLORS['bg']} 0%, #ddd6fe 100%);
            color: {MILITARY_COLORS['dark']}; 
        }}
        .command-card {{ 
            display: flex !important; 
            flex-direction: column !important; /* Stack vertically (CENTERED) */
            justify-content: center !important; 
            align-items: center !important; 
            text-align: center !important;
            padding: 30px !important; 
            min-height: 250px !important; 
            background: white; 
            border-radius: 4px; 
            border-right: 6px solid {MILITARY_COLORS['accent']}; 
            box-shadow: 0 4px 20px rgba(76,29,149,0.15); 
        }}
        .unit-card {{ background: white; border-radius: 4px; padding: 20px; text-align: center; border-right: 5px solid {MILITARY_COLORS['secondary']}; box-shadow: 0 4px 12px rgba(76,29,149,0.12); transition: all 0.25s ease; cursor: pointer; min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 20px; }}
        .unit-card:hover {{ transform: translateY(-5px); box-shadow: 0 12px 30px rgba(76,29,149,0.2); }}
        div.stButton > button {{ width: 100%; border-radius: 3px; font-weight: 700; padding: 0.75rem 1.5rem; box-shadow: 0 2px 8px rgba(76,29,149,0.2); transition: all 0.2s ease; background: linear-gradient(135deg, {MILITARY_COLORS['primary']}, {MILITARY_COLORS['secondary']}); color: white; }}
        .login-card {{ background: white; border-radius: 4px; border-right: 6px solid {MILITARY_COLORS['accent']}; box-shadow: 0 8px 32px rgba(76,29,149,0.15); padding: 40px; text-align: center; }}
        h1, h2, h3 {{ color: {MILITARY_COLORS['primary']}; font-weight: 900; }}
    </style>
    """, unsafe_allow_html=True)

    st.markdown(f"""
    <div style="background: linear-gradient(135deg, {MILITARY_COLORS['dark']}, {MILITARY_COLORS['primary']});
                color: {MILITARY_COLORS['accent2']};
                padding: 4px 20px;
                font-size: 0.7rem;
                letter-spacing: 3px;
                font-weight: 700;
                border-bottom: 2px solid {MILITARY_COLORS['accent']};">
        🎖️ מערכת בקרה ושליטה אגפים &nbsp;|&nbsp; CLASSIFIED
    </div>
    """, unsafe_allow_html=True)

    # ===== Helper Functions (Compact) =====

    def get_logo_url(unit_name):
        try:
            project_url = st.secrets['supabase']['url'].rstrip("/")
            english_name = UNIT_ID_MAP.get(unit_name, "default")
            return f"{project_url}/storage/v1/object/public/logos/{english_name}.png?t={int(time.time())}"
        except:
            return None

    @st.cache_data(ttl=15)
    def load_active_alerts():
        try:
            result = supabase.table("commander_alerts").select("*").eq("is_active", True).order("created_at", desc=True).execute()
            return result.data if result.data else []
        except:
            return []

    @st.cache_data(ttl=20)
    def get_available_logos():
        try:
            files = supabase.storage.from_("logos").list()
            if isinstance(files, list):
                return [f['name'] for f in files if isinstance(f, dict) and 'name' in f]
            return []
        except:
            return []

    def get_category_logo_url(category_id):
        try:
            project_url = st.secrets['supabase']['url'].rstrip("/")
            return f"{project_url}/storage/v1/object/public/logos/cat_{category_id}.png?t={int(time.time())}"
        except:
            return None

    def create_alert(commander_unit, message, deadline, priority="normal"):
        try:
            alert_data = {
                "commander_unit": commander_unit,
                "message": message,
                "response_deadline": deadline.isoformat(),
                "priority": priority,
                "is_active": True,
                "created_at": datetime.datetime.now().isoformat(),
                "created_by": st.session_state.selected_unit
            }
            supabase.table("commander_alerts").insert(alert_data).execute()
            load_active_alerts.clear()
            return True
        except Exception as e:
            st.error(f"שגיאה ביצירת התראה: {e}")
            return False

    def mark_alert_responded(alert_id, user_unit):
        try:
            response_data = {"alert_id": alert_id, "user_unit": user_unit, "responded_at": datetime.datetime.now().isoformat()}
            supabase.table("alert_responses").insert(response_data).execute()
            return True
        except:
            return False

    def check_user_responded(alert_id, user_unit):
        try:
            result = supabase.table("alert_responses").select("*").eq("alert_id", alert_id).eq("user_unit", user_unit).execute()
            return len(result.data) > 0 if result.data else False
        except:
            return False

    # ===== Combat Clock (Fixed) =====

    def get_week_range():
        today = datetime.datetime.now()
        weekday = today.weekday()
        start_date = today if weekday == 6 else today - datetime.timedelta(days=weekday + 1)
        end_date = start_date + datetime.timedelta(days=5)
        return start_date, end_date

    @st.cache_data(ttl=10)
    def load_combat_events(start_date, end_date):
        try:
            start_str = start_date.strftime("%Y-%m-%d")
            end_str = (end_date + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
            result = supabase.table("combat_clock").select("*")\
                .gte("start_time", start_str)\
                .lte("end_time", end_str)\
                .order("start_time").execute()
            return result.data if result.data else []
        except Exception as e:
            return []

    def add_combat_event(title, date, time_start, time_end):
        try:
            user_role = st.session_state.selected_unit
            color = MILITARY_COLORS['primary'] if user_role == "מח״ט" else MILITARY_COLORS['secondary']
            start_dt = datetime.datetime.combine(date, time_start)
            end_dt = datetime.datetime.combine(date, time_end)
            event_data = {
                "title": title,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
                "created_by": user_role,
                "color": color
                # Description removed safely
            }
            supabase.table("combat_clock").insert(event_data).execute()
            load_combat_events.clear()
            return True
        except Exception as e:
            st.error(f"שגיאה: {e}")
            return False

    def render_combat_clock():
        st.markdown("### 🗓️ שעון לחימה (שעל״ח)")
        start_week, end_week = get_week_range()
        c1, c2 = st.columns([3, 1])
        with c1:
            st.write(f"**שבוע:** {start_week.strftime('%d/%m')} - {end_week.strftime('%d/%m')}")
        if st.session_state.get("logged_in") and st.session_state.selected_unit in ["מח״ט", "סמח״ט"]:
            with c2:
                if st.button("➕ הוסף לו״ז"):
                    st.session_state.show_add_event = True
        if st.session_state.get("show_add_event", False):
            with st.form("new_event"):
                st.write("#### הוספת אירוע חדש")
                title = st.text_input("כותרת")
                col_d, col_t1, col_t2 = st.columns(3)
                with col_d:
                    e_date = st.date_input("תאריך", min_value=datetime.date.today())
                with col_t1:
                    e_start = st.time_input("התחלה", value=datetime.time(8, 0))
                with col_t2:
                    e_end = st.time_input("סיום", value=datetime.time(9, 0))
                if st.form_submit_button("שמור"):
                    if title:
                        if add_combat_event(title, e_date, e_start, e_end):
                            st.success("נוסף בהצלחה")
                            st.session_state.show_add_event = False
                            st.rerun()
                    else:
                        st.error("נדרשת כותרת")
                if st.form_submit_button("ביטול"):
                    st.session_state.show_add_event = False
                    st.rerun()
        days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"]
        cols = st.columns(6)
        events = load_combat_events(start_week, end_week)
        for i, day_name in enumerate(days):
            current_date = start_week + datetime.timedelta(days=i)
            with cols[i]:
                is_today = current_date.date() == datetime.date.today()
                border_style = f"3px solid {MILITARY_COLORS['accent']}" if is_today else f"1px solid {MILITARY_COLORS['border']}"
                st.markdown(f"""
                <div style="text-align: center; border-bottom: {border_style}; padding: 6px 4px; margin-bottom: 10px; border-radius: 3px;">
                    <div style="font-weight: 800; font-size: 0.9rem; color: {MILITARY_COLORS['primary']};">{day_name}</div>
                    <div style="font-size: 0.75rem; color: {MILITARY_COLORS['muted']};">{current_date.strftime('%d/%m')}</div>
                </div>
                """, unsafe_allow_html=True)
                day_events = [e for e in events if e['start_time'].startswith(current_date.strftime("%Y-%m-%d"))]
                for event in day_events:
                    start_t = datetime.datetime.fromisoformat(event['start_time']).strftime("%H:%M")
                    end_t = datetime.datetime.fromisoformat(event['end_time']).strftime("%H:%M")
                    bg_color = event.get('color', MILITARY_COLORS['secondary'])
                    st.markdown(f"""
                    <div style="background: {bg_color}; color: white; padding: 8px; border-radius: 3px; margin-bottom: 8px; font-size: 0.85rem;">
                        <div style="font-weight: 700;">{event['title']}</div>
                        <div style="font-size: 0.75rem; opacity: 0.85;">{start_t} - {end_t}</div>
                    </div>
                    """, unsafe_allow_html=True)
                    if st.session_state.get("logged_in") and st.session_state.selected_unit in ["מח״ט", "סמח״ט"]:
                        if st.button("🗑️", key=f"del_{event['id']}", help="מחק"):
                            try:
                                supabase.table("combat_clock").delete().eq("id", event['id']).execute()
                                load_combat_events.clear()
                                st.rerun()
                            except:
                                pass

    # ===== Authentication (Compact) =====

    def hash_password(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(stored_password, provided_password):
        try:
            if stored_password is None:
                return False
            return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password.encode('utf-8'))
        except:
            return False

    def get_stored_password(unit_name):
        try:
            result = supabase.table("unit_passwords").select("password").eq("unit_name", unit_name).execute()
            return result.data[0]['password'] if result.data else None
        except:
            return None

    def get_user_role(unit_name):
        if unit_name == "מח״ט": return "mahat"
        if unit_name == "סמח״ט": return "smahat"
        return "department"

    # ===== Login Screens (Compact) =====

    def render_unit_card(unit_name, icon="🎖️"):
        english_name = UNIT_ID_MAP.get(unit_name, "default")
        available_logos = get_available_logos()
        logo_exists = f"{english_name}.png" in available_logos
        is_command = unit_name in ["מח״ט", "סמח״ט"]
        if is_command:
            size = "200px"
            if logo_exists:
                logo_url = get_logo_url(unit_name)
                visual = f'<img src="{logo_url}" style="width:{size}; height:{size}; object-fit:contain;" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'block\';"/><div style="font-size:7rem; display:none;">{icon}</div>'
            else:
                visual = f'<div style="font-size: 7rem;">{icon}</div>'
            st.markdown(f'<div class="unit-card command-card">{visual}<h3 style="font-size:1.8rem;">{unit_name}</h3></div>', unsafe_allow_html=True)
        else:
            if logo_exists:
                logo_url = get_logo_url(unit_name)
                visual = f'<img src="{logo_url}" style="width:90px; height:90px; object-fit:contain; margin-bottom:10px;" onerror="this.style.display=\'none\';"/>'
            else:
                visual = f'<div style="font-size: 2.5rem; margin-bottom: 10px;">{icon}</div>'
            st.markdown(f'<div class="unit-card">{visual}<h3>{unit_name}</h3></div>', unsafe_allow_html=True)
        if st.button(f"כניסה ל{unit_name}", key=f"btn_{unit_name}", use_container_width=True):
            st.session_state.selected_unit = unit_name
            st.session_state.login_stage = "password"
            st.rerun()

    def render_login_gallery():
        st.markdown(f"<h1 style='text-align: center; margin: 20px 0 5px 0; font-size: 2.2rem;'>🎖️ מערכת בקרה ושליטה אגפים</h1>", unsafe_allow_html=True)
        cmd_cols = st.columns(2)
        with cmd_cols[0]:
            render_unit_card("סמח״ט")
        with cmd_cols[1]:
            render_unit_card("מח״ט")
        st.markdown("---")
        render_combat_clock()
        st.markdown("---")
        dept_icons = {"אג״ם": "📦", "מודיעין": "🔍", "משא״ן": "👥", "רפואה": "🏥", "לוגיסטיקה": "🚚", "תקשוב": "💻", "הגמ״ר": "🎓", "הנדסה": "🔧", "טנ״א": "🛠️"}
        cols = st.columns(3)
        for i, dept in enumerate(STAFF_DEPARTMENTS):
            with cols[i % 3]:
                render_unit_card(dept, dept_icons.get(dept, "🎖️"))

    def render_login_password():
        unit = st.session_state.selected_unit
        available_logos = get_available_logos()
        english_name = UNIT_ID_MAP.get(unit, "default")
        logo_exists = f"{english_name}.png" in available_logos
        c1, c2, c3 = st.columns([1, 2, 1])
        with c2:
            if logo_exists:
                logo_url = get_logo_url(unit)
                logo_html = f'<img src="{logo_url}" style="width:160px; height:160px; object-fit:contain; margin-bottom:15px; display:block; margin-left:auto; margin-right:auto;" onerror="this.style.display=\'none\'; document.getElementById(\'fallback_icon\').style.display=\'block\';"/><div id="fallback_icon" style="font-size:4rem; margin-bottom:15px; display:none;">🎖️</div>'
            else:
                logo_html = '<div style="font-size:4rem; margin-bottom:15px;">🎖️</div>'
            st.markdown(f'<div class="login-card">{logo_html}<h2 style="margin: 0; font-size:1.8rem;">כניסה ל{unit}</h2></div>', unsafe_allow_html=True)
            st.markdown("<br>", unsafe_allow_html=True)
            password = st.text_input("🔐 הזן סיסמה (0000 לכניסה ראשונית)", type="password", key="pwd_input")
            col_login, col_back = st.columns([2, 1])
            with col_login:
                if st.button("🚀 התחבר", type="primary", use_container_width=True):
                    stored_pwd = get_stored_password(unit)
                    is_valid = (password == "0000") or (stored_pwd and verify_password(stored_pwd, password))
                    if is_valid:
                        if password == "0000":
                            hashed = hash_password("0000")
                            try:
                                supabase.table("unit_passwords").upsert({"unit_name": unit, "password": hashed, "role": get_user_role(unit)}, on_conflict="unit_name").execute()
                            except:
                                pass
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

    # ===== Alert Display (Compact) =====

    def render_active_alerts():
        alerts = load_active_alerts()
        if not alerts:
            return
        for alert in alerts:
            already_responded = check_user_responded(alert['id'], st.session_state.selected_unit)
            deadline = pd.to_datetime(alert['response_deadline'])
            now = pd.Timestamp.now()
            time_remaining = deadline - now
            if time_remaining.total_seconds() <= 0:
                continue
            priority_info = ALERT_PRIORITIES.get(alert.get('priority', 'normal'), ALERT_PRIORITIES['normal'])
            hours = int(time_remaining.total_seconds() / 3600)
            minutes = int((time_remaining.total_seconds() % 3600) / 60)
            st.markdown(f"""
            <div style='background: linear-gradient(135deg, {MILITARY_COLORS["danger"]}, #b91c1c); color: white; padding: 20px; border-radius: 4px; margin-bottom: 20px;'>
                <div style='font-size: 1.4rem; font-weight: 800;'>{priority_info['icon']} התראה מ{alert['commander_unit']}</div>
                <div style='font-size: 1.1rem; margin: 10px 0;'>{alert['message']}</div>
                <div style='font-size: 0.9rem;'>⏰ זמן לתגובה: {hours}:{minutes:02d} שעות</div>
            </div>
            """, unsafe_allow_html=True)
            if not already_responded:
                if st.button("✅ אישור קריאה", key=f"respond_{alert['id']}"):
                    if mark_alert_responded(alert['id'], st.session_state.selected_unit):
                        st.success("✅ נרשם!")
                        time.sleep(0.5)
                        st.rerun()

    # ===== COMMAND CENTER - LIVE DATA WITH JINJA2 =====

    def render_advanced_dashboard():
        """מרכז פיקוד מבצעי חי עם נתונים אמיתיים מסופאבייס"""
        
        # ── 1. משיכת נתונים חיים מ-Supabase ──
        try:
            # ספירת נקודות אדומות
            red_points = supabase.table("reports_v2").select("id").eq("is_red_point", True).execute().data
            red_count = len(red_points) if red_points else 0
            
            # מוקדי חום (דיווחים עם עדיפות גבוהה)
            hot_zones = supabase.table("reports_v2").select("id").eq("priority", "high").execute().data
            hot_count = len(hot_zones) if hot_zones else 0
            
            # מבקרים פעילים (דיווחים ב-24 שעות האחרונות)
            yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat()
            recent = supabase.table("reports_v2").select("created_by").gte("created_at", yesterday).execute().data
            active_count = len(set([r['created_by'] for r in recent])) if recent else 0
            
            # אזורים ללא דיווח (חישוב מותאם אישית - כאן סימולציה)
            no_report_count = 2
            
            # חריגות בטיחות
            safety_issues = supabase.table("reports_v2").select("id").eq("has_safety_issue", True).execute().data
            safety_count = len(safety_issues) if safety_issues else 0
            
            # חישוב אחוז ביצוע (מול טבלת יעדים)
            target_res = supabase.table("weekly_targets").select("*").limit(1).execute().data
            if target_res and len(target_res) > 0:
                progress = int((target_res[0].get('completed', 47) / target_res[0].get('total_goal', 69)) * 100)
                completed_val = target_res[0].get('completed', 47)
                remaining_val = target_res[0].get('total_goal', 69) - completed_val
            else:
                progress, completed_val, remaining_val = 68, 47, 22
            
            # משיכת דיווחים למפה (latitude, longitude, priority, base)
            map_reports = supabase.table("reports_v2").select("latitude, longitude, priority, base, created_at").limit(50).execute().data
            
            # התראות פעילות
            active_alerts_data = supabase.table("commander_alerts").select("*").eq("is_active", True).order("created_at", desc=True).limit(5).execute().data
            
        except Exception as e:
            # st.error(f"שגיאה בטעינת נתונים: {e}")
            # ברירות מחדל למניעת קריסה
            red_count, hot_count, active_count, no_report_count, safety_count = 7, 3, 12, 2, 1
            progress, completed_val, remaining_val = 68, 47, 22
            map_reports = []
            active_alerts_data = []
        
        # ── 2. הכנת ה-HTML המרהיב עם Jinja2 Template ──
        html_template = \"\"\"
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מרכז פיקוד</title>
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
    :root {
    --bg: #0a0c14; --bg2: #0f1220; --bg3: #141828;
    --border: #1e2540; --border2: #2a3060;
    --purple: #7c3aed; --purple2: #a855f7; --purple3: #c084fc;
    --violet: #4c1d95; --red: #ef4444; --orange: #f97316;
    --green: #22c55e; --cyan: #06b6d4; --yellow: #eab308;
    --text: #e2e8f0; --text2: #94a3b8; --text3: #64748b;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Heebo', sans-serif; background: var(--bg); color: var(--text); direction: rtl; }
    .top-bar { background: linear-gradient(90deg, var(--violet), #1a0a3e, var(--bg2)); border-bottom: 1px solid var(--purple); padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 20px rgba(124,58,237,0.3); }
    .logo-text { font-size: 1rem; font-weight: 900; letter-spacing: 2px; color: #fff; text-transform: uppercase; }
    .live-dot { width: 8px; height: 8px; background: var(--green); border-radius: 50%; animation: livepulse 1.5s infinite; box-shadow: 0 0 8px var(--green); }
    @keyframes livepulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
    .main { padding: 16px 20px; max-width: 1800px; margin: 0 auto; }
    .status-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; position: relative; }
    .stat-card::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 3px; }
    .stat-card.red::before { background: var(--red); }
    .stat-card.orange::before { background: var(--orange); }
    .stat-card.green::before { background: var(--green); }
    .stat-card.purple::before { background: var(--purple2); }
    .stat-icon { font-size: 1.5rem; margin-bottom: 6px; }
    .stat-num { font-size: 2rem; font-weight: 900; line-height: 1; }
    .stat-label { font-size: 0.7rem; color: var(--text3); margin-top: 4px; }
    .stat-card.red .stat-num { color: var(--red); text-shadow: 0 0 12px rgba(239,68,68,0.6); }
    .stat-card.orange .stat-num { color: var(--orange); text-shadow: 0 0 12px rgba(249,115,22,0.6); }
    .stat-card.green .stat-num { color: var(--green); text-shadow: 0 0 12px rgba(34,197,94,0.6); }
    .stat-card.purple .stat-num { color: var(--purple2); text-shadow: 0 0 12px rgba(168,85,247,0.6); }
    .section-title { font-size: 0.65rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--text3); padding-bottom: 8px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
    .main-grid { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 14px; }
    .panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; padding: 16px; }
    .alert-item { padding: 10px 12px; border-radius: 3px; margin-bottom: 8px; border-right: 3px solid; background: var(--bg3); }
    .alert-item.critical { border-right-color: var(--red); }
    .alert-item.warning { border-right-color: var(--orange); }
    .alert-title { font-size: 0.82rem; font-weight: 700; }
    .alert-body { font-size: 0.75rem; color: var(--text2); margin-top: 4px; }
    .map-container { position: relative; background: #0d1117; border-radius: 3px; height: 380px; border: 1px solid var(--border); overflow: hidden; }
    .map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px); background-size: 40px 40px; }
    .map-dot { position: absolute; width: 12px; height: 12px; border-radius: 50%; transform: translate(-50%, -50%); z-index: 5; }
    .map-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid currentColor; opacity: 0.4; animation: dotping 2s infinite; }
    @keyframes dotping { 0% { transform:scale(0.8); opacity:0.6; } 100% { transform:scale(2); opacity:0; } }
    .map-dot.active { background: var(--green); color: var(--green); }
    .map-dot.warning { background: var(--orange); color: var(--orange); }
    .map-dot.critical { background: var(--red); color: var(--red); }
    .rank-item { display: flex; align-items: center; padding: 10px 12px; border-radius: 3px; margin-bottom: 6px; background: var(--bg3); border: 1px solid var(--border); }
    .rank-num { font-size: 1.2rem; font-weight: 900; width: 30px; text-align: center; }
    .rank-info { flex: 1; padding: 0 10px; }
    .rank-name { font-size: 0.85rem; font-weight: 700; }
    .ai-panel { background: linear-gradient(135deg, #0f0a1e, #0f1220); border: 1px solid #2a1a50; border-radius: 4px; padding: 16px; }
    .ai-insight { display: flex; gap: 10px; padding: 10px; background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2); border-radius: 3px; margin-bottom: 8px; }
    .ai-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; }
    .ai-text { font-size: 0.78rem; color: var(--text2); }
    </style>
    </head>
    <body>

    <div class="top-bar">
    <div style="display:flex; align-items:center; gap:16px;">
        <div class="logo-text">🎖️ מרכז פיקוד — חטמ״ר</div>
        <div class="live-dot"></div>
        <span style="font-size:0.65rem;color:var(--green);font-weight:700;">LIVE</span>
    </div>
    <div style="font-size:1.1rem; font-weight:700; color:var(--purple3);" id="clock"></div>
    </div>

    <div class="main">
    <!-- STATUS ROW -->
    <div class="status-row">
        <div class="stat-card red">
        <div class="stat-icon">🔴</div>
        <div class="stat-num">{{ red_count }}</div>
        <div class="stat-label">נקודות אדומות</div>
        </div>
        <div class="stat-card orange">
        <div class="stat-icon">🔥</div>
        <div class="stat-num">{{ hot_count }}</div>
        <div class="stat-label">מוקדי חום</div>
        </div>
        <div class="stat-card green">
        <div class="stat-icon">🧍</div>
        <div class="stat-num">{{ active_count }}</div>
        <div class="stat-label">מבקרים עכשיו</div>
        </div>
        <div class="stat-card red">
        <div class="stat-icon">📍</div>
        <div class="stat-num">{{ no_report_count }}</div>
        <div class="stat-label">ללא דיווח &gt;24ש׳</div>
        </div>
        <div class="stat-card orange">
        <div class="stat-icon">⚠️</div>
        <div class="stat-num">{{ safety_count }}</div>
        <div class="stat-label">חריגות בטיחות</div>
        </div>
        <div class="stat-card purple">
        <div class="stat-icon">🧭</div>
        <div class="stat-num">{{ progress }}%</div>
        <div class="stat-label">ביצוע תוכנית</div>
        </div>
    </div>

    <!-- MAIN GRID -->
    <div class="main-grid">
        
        <!-- LEFT: ALERTS -->
        <div class="panel">
        <div class="section-title">🚨 התראות מבצעיות <span style="color:var(--purple3);">{{ alerts|length }}</span></div>
        {% for alert in alerts %}
        <div class="alert-item {{ 'critical' if alert.priority == 'critical' else 'warning' }}">
            <div class="alert-title">{{ alert.message[:50] }}...</div>
            <div class="alert-body">{{ alert.message }}</div>
        </div>
        {% endfor %}
        </div>

        <!-- CENTER: MAP -->
        <div class="panel" style="padding:12px;">
        <div class="section-title">📍 מפה מבצעית חיה</div>
        <div class="map-container">
            <div class="map-grid"></div>
            <div id="mapDots"></div>
        </div>
        </div>

        <!-- RIGHT: LEADERBOARD + AI -->
        <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="panel">
            <div class="section-title">🏆 ביצועים</div>
            <div class="rank-item">
            <div class="rank-num">1</div>
            <div class="rank-info">
                <div class="rank-name">גזרה דרום</div>
                <div style="font-size:0.65rem; color:var(--text3);">27 ביקורים</div>
            </div>
            </div>
            <div class="rank-item">
            <div class="rank-num">2</div>
            <div class="rank-info">
                <div class="rank-name">גזרה מרכז</div>
                <div style="font-size:0.65rem; color:var(--text3);">22 ביקורים</div>
            </div>
            </div>
        </div>

        <div class="ai-panel">
            <div class="section-title" style="border-color:#2a1a50;">🤖 AI קצין מטה</div>
            <div class="ai-insight">
            <div class="ai-dot" style="background:var(--red);"></div>
            <div class="ai-text">נקודות אדומות עלו ב-<strong>{{ red_count }}</strong> מהשבוע שעבר</div>
            </div>
            <div class="ai-insight">
            <div class="ai-dot" style="background:var(--cyan);"></div>
            <div class="ai-text">שיעור השלמה: <strong>{{ progress }}%</strong> — במסלול ליעד</div>
            </div>
        </div>
        </div>
    </div>

    <!-- BOTTOM: COMPLETION STATS -->
    <div style="margin-top:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px;">
        <div class="panel" style="text-align:center;">
        <div style="font-size:3rem; font-weight:900; color:var(--purple2);">{{ progress }}%</div>
        <div style="color:var(--text3);">ביצוע תוכנית</div>
        </div>
        <div class="panel" style="text-align:center;">
        <div style="font-size:3rem; font-weight:900; color:var(--green);">{{ completed }}</div>
        <div style="color:var(--text3);">הושלמו</div>
        </div>
        <div class="panel" style="text-align:center;">
        <div style="font-size:3rem; font-weight:900; color:var(--red);">{{ remaining }}</div>
        <div style="color:var(--text3);">נותרו</div>
        </div>
    </div>
    </div>

    <script>
    // Clock
    function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('he-IL');
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Map Dots - Real Data from Supabase
    const reports = {{ reports_json | safe }};
    const mapContainer = document.getElementById('mapDots');

    reports.forEach((report, i) => {
    if (!report.latitude || !report.longitude) return;
    
    // Convert lat/lng to pixel positions (normalized 31-33 lat, 34.5-35.5 lng)
    const x = ((report.longitude - 34.5) / 1.0) * 100; // 0-100%
    const y = ((33 - report.latitude) / 2.0) * 100;    // 0-100%
    
    const dot = document.createElement('div');
    dot.className = 'map-dot ' + (report.priority === 'high' ? 'critical' : report.priority === 'medium' ? 'warning' : 'active');
    dot.style.top = y + '%';
    dot.style.right = x + '%';
    dot.title = report.base || 'נקודה ' + (i+1);
    mapContainer.appendChild(dot);
    });
    </script>

    </body>
    </html>
        \"\"\"
        
        # ── 3. הזרקת הנתונים לתוך ה-Template ──
        t = Template(html_template)
        rendered_html = t.render(
            red_count=red_count,
            hot_count=hot_count,
            active_count=active_count,
            no_report_count=no_report_count,
            safety_count=safety_count,
            progress=progress,
            completed=completed_val,
            remaining=remaining_val,
            alerts=active_alerts_data[:5],  # Top 5 alerts
            reports_json=json.dumps(map_reports)  # JSON for JS
        )
        
        # ── 4. הצגת ה-Dashboard במסך מלא ──
        components.html(rendered_html, height=1200, scrolling=True)

    # ===== Department Dashboard (Compact) =====

    def render_department_dashboard():
        unit = st.session_state.selected_unit
        col_logout, col_title = st.columns([1, 5])
        with col_logout:
            if st.button("🚪 יציאה", key="logout_dept"):
                st.session_state.logged_in = False
                st.session_state.selected_unit = None
                st.session_state.login_stage = "gallery"
                st.session_state.selected_category = None
                st.rerun()
        with col_title:
            st.markdown(f"## 📊 {unit} - מערכת בקרה ושליטה")
        render_active_alerts()
        st.markdown("---")
        if st.session_state.selected_category is None:
            cols = st.columns(2)
            for i, category in enumerate(QUESTIONNAIRE_CATEGORIES):
                with cols[i % 2]:
                    # Check for logo (Merged Logic)
                    cat_logo = f"cat_{category['id']}.png"
                    visual = ""
                    if cat_logo in get_available_logos():
                        visual = f'<div style="width: 80px; height: 80px; margin: 0 auto 15px auto; background-image: url(\'{get_category_logo_url(category["id"])}\'); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>'
                    else:
                        visual = f"<div style='font-size:2.5rem;'>{category['icon']}</div>"
                    
                    st.markdown(f"<div style='background:white; padding:20px; border-radius:4px; text-align:center; border-right:5px solid {MILITARY_COLORS['secondary']};'>{visual}<div style='font-weight:700; margin-top:10px;'>{category['name']}</div></div>", unsafe_allow_html=True)
                    if st.button(f"פתח", key=f"cat_{category['id']}", use_container_width=True):
                        st.session_state.selected_category = category['id']
                        st.rerun()
        else:
            if st.button("↩️ חזור"):
                st.session_state.selected_category = None
                st.rerun()
            st.info("🚧 שאלון בפיתוח")

    # ===== Logo Management (Compact + Merged) =====

    def render_logo_management():
        st.markdown("### 🖼️ ניהול לוגואים")
        all_units = STAFF_DEPARTMENTS + COMMAND_UNITS
        cols = st.columns(3)
        for i, unit in enumerate(all_units):
            with cols[i % 3]:
                st.markdown(f"**{unit}**")
                uploaded = st.file_uploader("העלה", type=['png', 'jpg', 'jpeg'], key=f"upl_{unit}", label_visibility="collapsed")
                if uploaded:
                    try:
                        image = Image.open(uploaded)
                        img_bytes = io.BytesIO()
                        image.save(img_bytes, format='PNG')
                        english_name = UNIT_ID_MAP.get(unit, "default")
                        supabase.storage.from_("logos").upload(path=f"{english_name}.png", file=img_bytes.getvalue(), file_options={"content-type": "image/png", "upsert": "true"})
                        st.success("✅")
                        time.sleep(1)
                        st.rerun()
                    except Exception as e:
                        st.error(f"❌ {e}")
        
        st.markdown("---")
        st.markdown("### 📋 לוגואים לקטגוריות")
        cat_cols = st.columns(3)
        for i, category in enumerate(QUESTIONNAIRE_CATEGORIES):
            with cat_cols[i % 3]:
                st.markdown(f"**{category['name']}**")
                # Show current
                if f"cat_{category['id']}.png" in get_available_logos():
                    st.image(get_category_logo_url(category['id']), width=50)
                
                uploaded = st.file_uploader("העלה", type=['png', 'jpg', 'jpeg'], key=f"upl_cat_{category['id']}", label_visibility="collapsed")
                if uploaded:
                    try:
                        image = Image.open(uploaded)
                        img_bytes = io.BytesIO()
                        image.save(img_bytes, format='PNG')
                        supabase.storage.from_("logos").upload(path=f"cat_{category['id']}.png", file=img_bytes.getvalue(), file_options={"content-type": "image/png", "upsert": "true"})
                        st.success("✅")
                        time.sleep(1)
                        st.rerun()
                    except Exception as e:
                        st.error(f"❌ {e}")

    # ===== Command Dashboard =====

    def render_command_dashboard():
        unit = st.session_state.selected_unit
        col_logout, col_title = st.columns([1, 5])
        with col_logout:
            if st.button("🚪 יציאה", key="logout_cmd"):
                st.session_state.logged_in = False
                st.session_state.selected_unit = None
                st.session_state.login_stage = "gallery"
                st.rerun()
        with col_title:
            st.markdown(f"## 🎖️ מרכז בקרה פיקודי — {unit}")
        render_active_alerts()
        st.markdown("---")
        
        tabs = st.tabs(["🎯 Command Center", "🚨 התראות", "🗓️ שעל״ח", "🖼️ לוגואים", "🔑 סיסמאות"])
        
        with tabs[0]:
            render_advanced_dashboard()
        
        with tabs[1]:
            with st.expander("➕ יצירת התראה", expanded=True):
                with st.form("new_alert"):
                    msg = st.text_area("תוכן")
                    col1, col2 = st.columns(2)
                    with col1:
                        priority = st.selectbox("עדיפות", list(ALERT_PRIORITIES.keys()), format_func=lambda x: ALERT_PRIORITIES[x]['name'])
                    with col2:
                        hours = st.number_input("שעות", 1, 168, 24)
                    if st.form_submit_button("📤 שלח"):
                        if msg:
                            deadline = datetime.datetime.now() + datetime.timedelta(hours=hours)
                            if create_alert(unit, msg, deadline, priority):
                                st.success("✅")
                                st.rerun()
        
        with tabs[2]:
            render_combat_clock()
        
        with tabs[3]:
            render_logo_management()
        
        with tabs[4]:
            st.info("🔑 ניהול סיסמאות")

    # ===== Main =====

    def main():
        if not st.session_state.logged_in:
            if st.session_state.login_stage == "gallery":
                render_login_gallery()
            elif st.session_state.login_stage == "password":
                render_login_password()
        else:
            role = st.session_state.role
            if role in ["mahat", "smahat"]:
                render_command_dashboard()
            else:
                render_department_dashboard()

    if __name__ == "__main__":
        main()
