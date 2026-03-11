// src/components/report/Tab4_Spirit.jsx
import { useAuth } from '../../context/AuthContext';

function RadioWithExplanation({ label, field, value, onChange, horizontal = true }) {
  const isExplain = value && value.startsWith('לא יודע');
  
  return (
    <div className={`space-y-1.5 bg-white p-3 rounded-lg border ${isExplain ? 'border-amber-400' : 'border-gray-100'} shadow-sm`}>
      <label className="label text-xs font-bold text-gray-700">{label}</label>
      <div className={`flex gap-2 ${horizontal ? 'flex-row' : 'flex-col'}`}>
        {['כן', 'לא', 'לא יודע / לא בדקתי'].map(opt => {
          const isSelected = value === opt || (opt === 'לא יודע / לא בדקתי' && isExplain);
          let btnClass = 'bg-white border-gray-200 text-gray-600 hover:border-gray-400';
          if (isSelected) {
            if (opt === 'כן') btnClass = 'bg-green-500 border-green-500 text-white';
            else if (opt === 'לא') btnClass = 'bg-red-500 border-red-500 text-white';
            else btnClass = 'bg-amber-500 border-amber-500 text-white';
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(field, opt)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${btnClass}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {isExplain && (
        <div className="mt-2 animate-fade-in">
          <input 
            type="text" 
            className="input-field text-sm py-1.5 border-amber-300 bg-amber-50" 
            placeholder="פרט מדוע לא נבדק..." 
            onChange={e => onChange(field, `לא יודע (${e.target.value})`)}
          />
        </div>
      )}
    </div>
  )
}

export default function Tab4_Spirit({ data, onChange }) {
  const { user } = useAuth();
  function set(field, value) { onChange(prev => ({ ...prev, [field]: value })); }

  const isCombatBrigade = ["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(user?.unit);

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="section-title">📜 נהלים ורוח</div>

      {/* נהלים בסיסיים */}
      <div className="card space-y-3 bg-gray-50 border-gray-200">
         <h3 className="font-bold text-gray-800 border-b pb-2">נהלים שוטפים</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="האם יש הוראות רבנות בש.ג?" field="r_sg" value={data.r_sg} onChange={set} />
            <RadioWithExplanation label="האם יש הוראות רבנות בחמ״ל?" field="r_hamal" value={data.r_hamal} onChange={set} />
            <RadioWithExplanation label="האם יש שילוט שבת (תמי 4 וכד')?" field="r_sign" value={data.r_sign} onChange={set} />
            <RadioWithExplanation label="האם קיימות נטלות?" field="r_netilot" value={data.r_netilot} onChange={set} />
         </div>
      </div>

      {/* שיעורי תורה (סדיר לעומת חטמ"ר) */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">📖 רוח ושיעורי תורה</h3>
        {isCombatBrigade ? (
          <div className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
             <h4 className="font-bold text-idf-blue">מעקב שיעורים וימי ישיבה (סדיר)</h4>
             <div className="grid grid-cols-2 gap-3">
                <div><label className="label text-xs">תאריך השיעור</label><input type="date" className="input-field text-sm" value={data.lesson_date || ''} onChange={e=>set('lesson_date', e.target.value)} /></div>
                <div><label className="label text-xs">מיקום</label><input type="text" className="input-field text-sm" value={data.lesson_location || ''} onChange={e=>set('lesson_location', e.target.value)} /></div>
                <div><label className="label text-xs">כמות שיעורים</label><input type="number" className="input-field text-sm" value={data.lesson_qty || 0} onChange={e=>set('lesson_qty', e.target.value)} /></div>
                <div><label className="label text-xs">משתתפים משוערים</label><input type="number" className="input-field text-sm" value={data.lesson_participants || 0} onChange={e=>set('lesson_participants', e.target.value)} /></div>
             </div>
             <div><label className="label text-xs">תוכן השיעור</label><input type="text" className="input-field text-sm" value={data.lesson_content || ''} onChange={e=>set('lesson_content', e.target.value)} /></div>
             <div><label className="label text-xs">מעבירי השיעור</label><input type="text" className="input-field text-sm" value={data.lesson_instructors || ''} onChange={e=>set('lesson_instructors', e.target.value)} /></div>
             <div>
                <label className="label text-xs">סוג אוכלוסיה</label>
                <select className="select-field text-sm" value={data.lesson_population || ''} onChange={e=>set('lesson_population', e.target.value)}>
                   <option value="">—</option><option>חיילי חובה</option><option>קצינים</option><option>מילואים</option><option>מעורב</option><option>אחר</option>
                </select>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <RadioWithExplanation label="האם יש ימי ישיבה?" field="soldier_yeshiva" value={data.soldier_yeshiva} onChange={set} />
             <RadioWithExplanation label="האם יש רצון לשיעור תורה?" field="soldier_want_lesson" value={data.soldier_want_lesson} onChange={set} />
             <RadioWithExplanation label="יש שיעור תורה במוצב?" field="soldier_has_lesson" value={data.soldier_has_lesson} onChange={set} />
             <RadioWithExplanation label="האם המענה הכשרותי מספק?" field="soldier_food" value={data.soldier_food} onChange={set} />
             
             {data.soldier_has_lesson === 'כן' && (
                 <div className="col-span-full grid grid-cols-2 gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200 mt-2">
                     <div><label className="label text-xs text-blue-800">שם מעביר השיעור</label><input type="text" className="input-field text-sm" value={data.soldier_lesson_teacher || ''} onChange={e=>set('soldier_lesson_teacher', e.target.value)} /></div>
                     <div><label className="label text-xs text-blue-800">טלפון</label><input type="text" className="input-field text-sm" dir="ltr" value={data.soldier_lesson_phone || ''} onChange={e=>set('soldier_lesson_phone', e.target.value)} /></div>
                 </div>
             )}
          </div>
        )}
      </div>

      {/* שיחת חתך ענקית לחטמ"רים בלבד */}
      {!isCombatBrigade && (
        <div className="card space-y-5 border-2 border-indigo-100 bg-indigo-50/30">
           <h3 className="text-lg font-bold text-indigo-900 border-b border-indigo-200 pb-2">👮 שאלון חיילים (שיחת חתך)</h3>
           
           <h4 className="font-bold text-sm text-indigo-800 mt-4">🙏 תפילות וצומות</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="זמני תפילות לפי פקודות?" field="hq_prayer_times" value={data.hq_prayer_times} onChange={set} />
              <RadioWithExplanation label="פעילות לפני תפילת בוקר?" field="hq_pre_prayer_act" value={data.hq_pre_prayer_act} onChange={set} />
              <RadioWithExplanation label="ארוחת בוקר אחרי התפילה?" field="hq_post_prayer_meal" value={data.hq_post_prayer_meal} onChange={set} />
              <RadioWithExplanation label="מתאפשר להתפלל במניין?" field="hq_minyan" value={data.hq_minyan} onChange={set} />
              <RadioWithExplanation label="שחרור מצום (לפני ואחרי)?" field="hq_fast_exempt" value={data.hq_fast_exempt} onChange={set} />
              <RadioWithExplanation label="ארוחה חמה לצמים?" field="hq_fast_meals" value={data.hq_fast_meals} onChange={set} />
           </div>

           <h4 className="font-bold text-sm text-indigo-800 mt-4">🧑‍💼 כשרות ויהדות בשבת</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="הכלים מסומנים ויש הפרדה?" field="hq_tools_marked" value={data.hq_tools_marked} onChange={set} />
              <RadioWithExplanation label="בקשות למהדרין נענו?" field="hq_mehadrin_req" value={data.hq_mehadrin_req} onChange={set} />
              <RadioWithExplanation label="ניוד מזון בשבת?" field="hq_shabbat_logistics" value={data.hq_shabbat_logistics} onChange={set} />
              <RadioWithExplanation label="תרגילים בשבת?" field="hq_shabbat_drills" value={data.hq_shabbat_drills} onChange={set} />
              <RadioWithExplanation label="רישום מחייב בשבת (לא חיוני)?" field="hq_forced_reg" value={data.hq_forced_reg} onChange={set} />
              <RadioWithExplanation label="חילול שבת יחידתי מובהק?" field="hq_shabbat_violation" value={data.hq_shabbat_violation} onChange={set} />
           </div>

           <h4 className="font-bold text-sm text-indigo-800 mt-4">⚙️ הווי ופעילות</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="שעות נפרדות בחדר כושר?" field="hq_gym_separate" value={data.hq_gym_separate} onChange={set} />
              <RadioWithExplanation label="שמירות ייחוד (בנים-בנות)?" field="hq_yichud" value={data.hq_yichud} onChange={set} />
              <RadioWithExplanation label="המפקדים רגישים לצרכי דת?" field="hq_cmd_sensitivity" value={data.hq_cmd_sensitivity} onChange={set} />
           </div>
        </div>
      )}
    </div>
  )
}
