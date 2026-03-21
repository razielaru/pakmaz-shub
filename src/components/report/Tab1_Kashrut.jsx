// src/components/report/Tab1_Kashrut.jsx
import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import RadioWithExplanation from './RadioWithExplanation';

export default function Tab1_Kashrut({ data, onChange }) {
  const { user } = useAuth();
  function set(field, value) { onChange(prev => ({ ...prev, [field]: value })); }

  const isCombatBrigade = ["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(user?.unit);

  // יצירת מערך שאלות מעורבב (Shuffled) פעם אחת בטעינה
  const kashrutQuestions = useMemo(() => {
    let questions = isCombatBrigade ? [
      { label: "האם יש דף תאריכים לתבלינים?", key: "k_dates" },
      { label: "האם יש הפרדה בכיורים ומשטחים?", key: "k_separation" },
      { label: "האם יש חימום נפרד בין בשר ודגים?", key: "k_heater" },
      { label: "האם יש שטיפת ירק?", key: "k_leafs" },
      { label: "בוצע חירור גסטרונומים?", key: "k_holes" },
      { label: "האם רכש חוץ מתנהל לפי פקודה?", key: "k_products" },
      { label: "האם מבוצעת בדיקת ביצים?", key: "k_eggs" },
      { label: "האם מולאה אפליקציה?", key: "k_app" },
      { label: "האם בוצע תדריך טבחים?", key: "k_briefing" },
    ] : [
      { label: "האם יש הפרדה?", key: "k_separation" },
      { label: "האם בוצע תדריך טבחים?", key: "k_briefing" },
      { label: "האם רכש חוץ מתנהל לפי פקודה?", key: "k_products" },
      { label: "האם יש דף תאריכים לתבלינים?", key: "k_dates" },
      { label: "האם יש שטיפת ירק?", key: "k_leafs" },
      { label: "בוצע חירור גסטרונומים?", key: "k_holes" },
      { label: "האם מבוצעת בדיקת ביצים?", key: "k_eggs" },
      { label: "האם יש חדר מכ״ש במפג״ד?", key: "k_machshir" },
      { label: "האם יש חימום נפרד בין בשר ודגים?", key: "k_heater" },
      { label: "האם מולאה אפליקציה?", key: "k_app" },
    ];
    return questions.sort(() => Math.random() - 0.5);
  }, [isCombatBrigade]);

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="section-title">🍽️ כשרות המטבח</div>

      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">כללי</h3>
        <div>
          <label className="label">סוג מטבח</label>
          <select value={data.k_cook_type || ''} onChange={e => set('k_cook_type', e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            <option>מבשל</option>
            <option>מחמם</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RadioWithExplanation label="תעודת כשרות מתוקפת?" field="k_cert" value={data.k_cert} onChange={set} />
          <RadioWithExplanation label="האם יש בישול ישראל?" field="k_bishul" value={data.k_bishul} onChange={set} />
        </div>
      </div>

      <div className="card space-y-4 border-2 border-red-100 bg-red-50/30">
        <h3 className="font-bold text-red-800 border-b border-red-200 pb-2">📸 תקלות ונאמן כשרות</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RadioWithExplanation label="יש תקלות כשרות?" field="k_issues" value={data.k_issues} onChange={set} />
          <RadioWithExplanation label="יש נאמן כשרות בשבת?" field="k_shabbat_supervisor" value={data.k_shabbat_supervisor} onChange={set} />
        </div>

        {data.k_issues === 'כן' && (
          <div className="space-y-3 bg-white p-4 rounded-xl border border-red-200 mt-2">
            <label className="label text-red-700">פרט את תקלות הכשרות שנמצאו</label>
            <textarea className="input-field min-h-[80px]" value={data.k_issues_description || ''} onChange={e => set('k_issues_description', e.target.value)} />
            <label className="label">📷 תמונת תקלה (אופציונלי)</label>
            <input type="file" accept="image/*" onChange={e => set('k_issues_photo', e.target.files[0])} className="input-field py-2" />
          </div>
        )}

        {data.k_shabbat_supervisor === 'כן' && (
          <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-200 mt-2">
            <div className="grid grid-cols-2 gap-3">
               <div><label className="label">שם נאמן כשרות</label><input type="text" className="input-field" value={data.k_shabbat_supervisor_name || ''} onChange={e => set('k_shabbat_supervisor_name', e.target.value)} /></div>
               <div><label className="label">טלפון נאמן</label><input type="tel" className="input-field" dir="ltr" value={data.k_shabbat_supervisor_phone || ''} onChange={e => set('k_shabbat_supervisor_phone', e.target.value)} /></div>
            </div>
            <label className="label">📷 תמונת נאמן (אופציונלי)</label>
            <input type="file" accept="image/*" onChange={e => set('k_shabbat_photo', e.target.files[0])} className="input-field py-2" />
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">📋 שאלון כשרות דינמי</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kashrutQuestions.map((q) => (
            <RadioWithExplanation key={q.key} label={q.label} field={q.key} value={data[q.key]} onChange={set} />
          ))}
        </div>
      </div>
    </div>
  )
}
