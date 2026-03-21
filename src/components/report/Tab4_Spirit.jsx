// src/components/report/Tab4_Spirit.jsx — FULL VERSION
import { useAuth } from '../../context/AuthContext';
import RadioWithExplanation from './RadioWithExplanation';

export default function Tab4_Spirit({ data, onChange }) {
  const { user } = useAuth();
  
  function set(field, value) { 
    onChange(prev => ({ ...prev, [field]: value })); 
  }
  
  const isCombatBrigade = ["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(user?.unit);

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="section-title">📜 נהלים ורוח</div>

      {/* נהלים בסיסיים */}
      <div className="card space-y-3 bg-gray-50 border-gray-200">
        <h3 className="font-bold text-gray-800 border-b pb-2">📋 נהלים שוטפים</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RadioWithExplanation label="האם יש הוראות רבנות בש.ג?" field="r_sg" value={data.r_sg} onChange={set} />
          <RadioWithExplanation label="האם יש הוראות רבנות בחמ״ל?" field="r_hamal" value={data.r_hamal} onChange={set} />
          <RadioWithExplanation label="האם יש שילוט שבת (תמי 4 וכד')?" field="r_sign" value={data.r_sign} onChange={set} />
          <RadioWithExplanation label="האם קיימות נטלות?" field="r_netilot" value={data.r_netilot} onChange={set} />
        </div>
      </div>
      
{/* שיעורי תורה */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">📖 רוח ושיעורי תורה</h3>

        {/* טופס הזנת פעילויות / שיעורים (סדיר) */}
        {isCombatBrigade ? (
          <div className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-idf-blue">טופס הזנת פעילויות / שיעורים</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">פיקוד *</label>
                <input type="text" className="input-field text-sm bg-white" placeholder='לדוגמה: פקמ"ז' value={data.command || ''} onChange={e => set('command', e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">יחידה *</label>
                <input type="text" className="input-field text-sm bg-white" placeholder="לדוגמה: 408" value={data.unit || ''} onChange={e => set('unit', e.target.value)} />
              </div>
              
              <div>
                <label className="label text-xs">תאריך הפעילות *</label>
                <input type="date" className="input-field text-sm bg-white" value={data.activity_date || ''} onChange={e => set('activity_date', e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">סוג הפעילות</label>
                <input type="text" className="input-field text-sm bg-white" value={data.activity_type || ''} onChange={e => set('activity_type', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label text-xs">שם השיעור *</label>
              <input type="text" className="input-field text-sm bg-white" value={data.lesson_name || ''} onChange={e => set('lesson_name', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">האם המעביר הוא רב היחידה? *</label>
                <select className="select-field text-sm bg-white" value={data.is_rabbi_instructor || ''} onChange={e => set('is_rabbi_instructor', e.target.value)}>
                  <option value="">—</option>
                  <option value="כן">כן</option>
                  <option value="לא">לא</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">שם המעביר *</label>
                <input type="text" className="input-field text-sm bg-white" value={data.instructor_name || ''} onChange={e => set('instructor_name', e.target.value)} />
              </div>

              <div>
                <label className="label text-xs">כמות משתתפים *</label>
                <input type="number" className="input-field text-sm bg-white" value={data.participants_count || ''} onChange={e => set('participants_count', e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">סוג משתתפים *</label>
                <input type="text" className="input-field text-sm bg-white" placeholder="לדוגמה: חיילים דתיים" value={data.participants_type || ''} onChange={e => set('participants_type', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label text-xs">מיקום ביחידה</label>
              <input type="text" className="input-field text-sm bg-white" placeholder="בית כנסת/ שם הטייסת/שם היחידה/שם הפלוגה וכד'" value={data.location_in_unit || ''} onChange={e => set('location_in_unit', e.target.value)} />
            </div>
            
          </div>
        ) : (
          /* חטמ"ר — שאלות שיעור בסיסיות */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="האם יש ימי ישיבה?" field="soldier_yeshiva" value={data.soldier_yeshiva} onChange={set} />
            <RadioWithExplanation label="האם המענה הכשרותי מספק?" field="soldier_food" value={data.soldier_food} onChange={set} />
            
            {/* שאלה: יש שיעור תורה? */}
            <RadioWithExplanation label="יש שיעור תורה במוצב?" field="soldier_has_lesson" value={data.soldier_has_lesson} onChange={set} />
            {data.soldier_has_lesson === 'כן' && (
              <div className="col-span-full grid grid-cols-2 gap-2 bg-blue-50 p-2 rounded-xl border border-blue-200 mt-1 animate-fade-in">
                <div><label className="label text-xs text-blue-800">שם מעביר השיעור</label><input type="text" className="input-field text-sm bg-white" value={data.soldier_lesson_teacher || ''} onChange={e => set('soldier_lesson_teacher', e.target.value)} /></div>
                <div><label className="label text-xs text-blue-800">טלפון</label><input type="text" className="input-field text-sm bg-white" dir="ltr" value={data.soldier_lesson_phone || ''} onChange={e => set('soldier_lesson_phone', e.target.value)} /></div>
              </div>
            )}

            {/* שאלה: יש רצון לשיעור תורה? */}
            <RadioWithExplanation label="האם יש רצון לשיעור תורה?" field="soldier_want_lesson" value={data.soldier_want_lesson} onChange={set} />
            {data.soldier_want_lesson === 'כן' && (
              <div className="col-span-full grid grid-cols-2 gap-3 bg-green-50 p-3 rounded-xl border border-green-200 mt-1 animate-fade-in">
                <div>
                  <label className="label text-xs text-green-800 mb-1">כמה אנשים רוצים?</label>
                  <input type="number" className="input-field text-sm bg-white" placeholder="כמות..." value={data.soldier_want_lesson_qty || ''} onChange={e => set('soldier_want_lesson_qty', e.target.value)} />
                </div>
                <div>
                  <label className="label text-xs text-green-800 mb-1">טלפון איש קשר</label>
                  <input type="text" className="input-field text-sm bg-white" dir="ltr" placeholder="050-0000000" value={data.soldier_want_lesson_phone || ''} onChange={e => set('soldier_want_lesson_phone', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* הערות חופשיות */}
      <div className="card">
        <label className="label">📝 הערות חופשיות</label>
        <textarea 
          className="input-field min-h-[80px] resize-none"
          placeholder="הערות נוספות על הרוח, הנהלים, הצרכים הדתיים..."
          value={data.free_text || ''} 
          onChange={e => set('free_text', e.target.value)} 
        />
      </div>

    </div>
  );
}
