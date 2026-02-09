# 🕍 מערכת בקרה רבנות צה"ל
## IDF Rabbinate Control System

מערכת ניהול ובקרה מקיפה לרבנות צה"ל, המאפשרת מעקב אחר דוחות כשרות, עירובים, ומזוזות ביחידות השטח.

## ✨ תכונות עיקריות

### 📊 דשבורד פיקודי
- **סקירה כללית** - מדדים מרכזיים ותרשימי זרימה ארגוניים
- **ליגת יחידות** - דירוג ביצועים עם מדליות ותגים
- **תובנות AI** - ניתוח חכם והתראות אוטומטיות
- **ניתוח יחידה** - צלילה עמוקה לנתוני כל יחידה
- **מפה אינטראקטיבית** - תצוגה גיאוגרפית עם צבעים לפי יחידה
- **ניהול מערכת** - שיוך יחידות, סיסמאות, ולוגואים

### 📝 דיווח שטח
- טפסים מקיפים לכשרות, עירוב, נהלים ולוגיסטיקה
- העלאת תמונות
- תיעוד מיקום GPS אוטומטי
- שמירה אוטומטית ב-Cloud

### 🔐 אבטחה
- הצפנת סיסמאות עם bcrypt
- ניהול הרשאות לפי תפקיד (פיקוד/אוגדה/חטמ"ר)
- Row Level Security ב-Supabase

## 🚀 התקנה מקומית

### דרישות מקדימות
- Python 3.9+
- חשבון Supabase (חינם)

### שלבי התקנה

1. **שכפול הפרויקט:**
```bash
git clone https://github.com/YOUR_USERNAME/idf-rabbinate-system.git
cd idf-rabbinate-system
```

2. **התקנת תלויות:**
```bash
pip install -r requirements.txt
```

3. **הגדרת Supabase:**
   - צור פרויקט חדש ב-[Supabase](https://supabase.com)
   - צור את הטבלאות הבאות:
     - `reports` - דוחות שטח
     - `unit_passwords` - סיסמאות יחידות
     - `hierarchy` - היררכיית יחידות
   - צור bucket בשם `logos` ב-Storage

4. **הגדרת Secrets:**
   
   צור קובץ `.streamlit/secrets.toml`:
   ```toml
   [supabase]
   url = "YOUR_SUPABASE_URL"
   key = "YOUR_SUPABASE_ANON_KEY"
   ```

5. **הרצת האפליקציה:**
```bash
streamlit run app.py
```

האפליקציה תיפתח בדפדפן ב-`http://localhost:8501`

## 📱 פריסה לפרודקשן

ראה [מדריך פריסה מפורט](deployment_guide.md) להוראות מלאות.

### פריסה מהירה ל-Streamlit Cloud

1. העלה את הקוד ל-GitHub
2. היכנס ל-[Streamlit Cloud](https://share.streamlit.io/)
3. צור אפליקציה חדשה והצבע על ה-repository
4. הגדר Secrets מההגדרות המתקדמות
5. פרוס!

## 🏗️ מבנה הפרויקט

```
mentorship_system/
├── app.py                    # קוד ראשי
├── requirements.txt          # תלויות Python
├── .streamlit/
│   ├── config.toml          # הגדרות Streamlit
│   └── secrets.toml         # סודות (לא ב-Git!)
├── .gitignore               # קבצים להתעלם
└── README.md                # קובץ זה
```

## 🔑 כניסה למערכת

### יחידות ברירת מחדל:

**פיקוד מרכז:**
- יחידה: `פיקוד מרכז`
- סיסמה: `0000`

**אוגדות:**
- יחידה: `אוגדת 877` או `אוגדת 96`
- סיסמה: `0000`

**חטמ"רים:**
- יחידה: כל אחד מ-7 החטמ"רים
- סיסמה: `0000`

> ⚠️ **חשוב:** שנה את הסיסמאות בפרודקשן!

## 🛠️ טכנולוגיות

- **Frontend:** Streamlit
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Charts:** Plotly
- **Maps:** Pydeck
- **Security:** bcrypt
- **Deployment:** Streamlit Cloud

## 📊 סכימת Database

### טבלת `reports`
```sql
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  unit TEXT NOT NULL,
  date TIMESTAMP DEFAULT NOW(),
  base TEXT,
  inspector TEXT,
  latitude FLOAT,
  longitude FLOAT,
  -- שדות כשרות
  k_cert TEXT,
  k_dates TEXT,
  -- שדות עירוב
  e_status TEXT,
  e_type TEXT,
  -- ועוד...
);
```

### טבלת `hierarchy`
```sql
CREATE TABLE hierarchy (
  id SERIAL PRIMARY KEY,
  parent_unit TEXT NOT NULL,
  child_unit TEXT NOT NULL UNIQUE
);
```

### טבלת `unit_passwords`
```sql
CREATE TABLE unit_passwords (
  id SERIAL PRIMARY KEY,
  unit_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT
);
```

## 🤝 תרומה

רוצה לתרום? מעולה!

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/AmazingFeature`)
3. Commit את השינויים (`git commit -m 'Add some AmazingFeature'`)
4. Push ל-branch (`git push origin feature/AmazingFeature`)
5. פתח Pull Request

## 📝 רישיון

פרויקט זה נוצר עבור רבנות צה"ל.

## 📞 תמיכה

לשאלות או בעיות, פתח Issue ב-GitHub.

---

**נבנה עם ❤️ עבור רבנות צה"ל**
