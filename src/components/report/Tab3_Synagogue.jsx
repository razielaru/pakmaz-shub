// src/components/report/Tab3_Synagogue.jsx — FULL VERSION with all questions
import { useAuth } from '../../context/AuthContext';
import RadioWithExplanation from './RadioWithExplanation';

export default function Tab3_Synagogue({ data, onChange }) {
  const { user } = useAuth();
  function set(field, value) { onChange(prev => ({ ...prev, [field]: value })); }
  const isCombatBrigade = ["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(user?.unit);

  const handleBookToggle = (book) => {
    const current = data.s_books ? data.s_books.split(',') : [];
    set('s_books', current.includes(book) ? current.filter(b => b !== book).join(',') : [...current, book].join(','));
  };

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="section-title">🕍 בית כנסת ועירוב</div>

      {/* ספר תורה */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">📜 ספר תורה וספרים</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">מס' צ' של ספר התורה</label>
            <input type="text" className="input-field" placeholder="לדוגמה: 12345"
              value={data.s_torah_id || ''} onChange={e => set('s_torah_id', e.target.value)} />
          </div>
          <div>
            <label className="label">נוסח ספר התורה</label>
            <select className="select-field" value={data.s_torah_nusach || ''} onChange={e => set('s_torah_nusach', e.target.value)}>
              <option value="">— בחר —</option>
              <option>ספרדי</option><option>אשכנז</option><option>תימן</option><option>אחר</option><option>לא ידוע</option>
            </select>
          </div>
        </div>
        <RadioWithExplanation label="בשגרה: ס״ת, תפילין, טליתות, כיפות, נרות — הכל מסודר?" field="hq_shul_sefer_torah" value={data.hq_shul_sefer_torah} onChange={set} />
        <div>
          <label className="label">ספרי יסוד קיימים:</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {["תורת המחנה", "לוח דינים", "הלכה כסדרה", "שו״ת משיב מלחמה"].map(book => {
              const isActive = data.s_books?.includes(book);
              return (
                <button key={book} type="button" onClick={() => handleBookToggle(book)}
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg border-2 transition-all ${isActive ? 'bg-idf-blue text-white border-idf-blue' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {isActive ? '✓ ' : '+ '}{book}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* תשתיות ביהכ"נ */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">🏛️ תשתיות וציוד בית הכנסת</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RadioWithExplanation label="האם לוח רבנות מעודכן?" field="s_board" value={data.s_board} onChange={set} />
          <RadioWithExplanation label="האם בית הכנסת נקי?" field="s_clean" value={data.s_clean} onChange={set} />
          <RadioWithExplanation label="האם יש ערכת הבדלה והדלקת נרות שבת?" field="s_havdala" value={data.s_havdala} onChange={set} />
          <RadioWithExplanation label="האם יש גמ״ח טלית ותפילין?" field="s_gemach" value={data.s_gemach} onChange={set} />
          <RadioWithExplanation label="האם יש תקלת בינוי (אם כן — עדכנת בסמארט-ביס)?" field="s_smartbis" value={data.s_smartbis} onChange={set} expected="לא" />
          <RadioWithExplanation label="האם יש פח גניזה?" field="s_geniza" value={data.s_geniza} onChange={set} />
          <RadioWithExplanation label="בית הכנסת מטופל ועובר ניקיון שוטף?" field="hq_shul_clean" value={data.hq_shul_clean} onChange={set} />
          <RadioWithExplanation label="ישנו ציוד חסר בבית הכנסת?" field="hq_shul_equip_missing" value={data.hq_shul_equip_missing} onChange={set} expected="לא" />
        </div>
      </div>

      {/* ציוד חגים */}
      <div className="card space-y-4 bg-amber-50/30 border-amber-100">
        <h3 className="font-bold text-amber-800 border-b border-amber-200 pb-2">🎉 ציוד חגים ומועדים</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RadioWithExplanation label="ניתן מענה בחגים (מגילה, חנוכיות וכד')?" field="hq_holiday_equipment" value={data.hq_holiday_equipment} onChange={set} />
          <RadioWithExplanation label="מקבלים ציוד מותאם לחגים?" field="hq_holiday_equip_recv" value={data.hq_holiday_equip_recv} onChange={set} />
          <RadioWithExplanation label="פניתם וביקשתם ציוד דת ולא קיבלתם?" field="hq_religion_equip_req" value={data.hq_religion_equip_req} onChange={set} expected="לא" />
          <RadioWithExplanation label="ישנו פער במזוזות ביחידה?" field="hq_mezuzot_gap" value={data.hq_mezuzot_gap} onChange={set} expected="לא" />
          <div>
            <label className="label">כמות מזוזות חסרות</label>
            <input type="number" min="0" className="input-field"
              value={data.r_mezuzot_missing || 0} onChange={e => set('r_mezuzot_missing', e.target.value)} />
          </div>
        </div>
      </div>

      {/* לוח מידע לסדיר בלבד */}
      {isCombatBrigade && (
        <div className="card space-y-4 bg-blue-50/30 border-blue-100">
          <h3 className="font-bold text-blue-800 border-b border-blue-200 pb-2">📋 לוח רבנות מורחב (סדיר)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="לוח מכיל: לוז שבת, מפת עירוב, לוז ישיבה?" field="hq_board_info" value={data.hq_board_info} onChange={set} />
            <RadioWithExplanation label="האם קיימת עמדת טלית ותפילין?" field="hq_tefillin_stand" value={data.hq_tefillin_stand} onChange={set} />
          </div>
        </div>
      )}

      {/* עירוב */}
      <div className={`card space-y-4 border-2 ${data.e_status === 'פסול' ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
        <h3 className={`font-bold border-b pb-2 ${data.e_status === 'פסול' ? 'text-red-800 border-red-200' : 'text-gray-800'}`}>🚧 מערך העירוב</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full md:col-span-1">
            <label className="label">סטטוס עירוב (חובה) <span className="text-red-500">*</span></label>
            <select value={data.e_status || ''} onChange={e => set('e_status', e.target.value)} className="select-field text-lg font-bold">
              <option value="">— בחר —</option>
              <option value="תקין">🟢 תקין</option>
              <option value="פסול">🔴 פסול</option>
              <option value="בטיפול">🟡 בטיפול</option>
            </select>
          </div>
          <RadioWithExplanation label="האם בוצעה בדיקה פיזית?" field="e_check" value={data.e_check} onChange={set} />
          <RadioWithExplanation label="האם בוצע תיעוד?" field="e_doc" value={data.e_doc} onChange={set} />
          <RadioWithExplanation label="האם קיימת תצ״א?" field="e_photo" value={data.e_photo} onChange={set} />
          <RadioWithExplanation label="קיימת בעיה עם עירוב — וקיבלתם מענה?" field="hq_eruv_problem" value={data.hq_eruv_problem} onChange={set} />
        </div>
        {data.e_status === 'פסול' && (
          <div className="bg-red-100 rounded-xl p-3 border border-red-300">
            <p className="text-red-800 font-bold text-sm">🚨 עירוב פסול — נדרש דיווח דחוף לרב החטמ"ר!</p>
          </div>
        )}
      </div>

      {/* עירוב מורחב לסדיר */}
      {isCombatBrigade && (
        <div className="card space-y-4 bg-amber-50/30 border-amber-100">
          <h3 className="font-bold text-amber-800 border-b border-amber-200 pb-2">🔗 עירוב מורחב (סדיר)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="האם קיימת צורת הפתח לעירוב?" field="hq_eruv_door_shape" value={data.hq_eruv_door_shape} onChange={set} />
            <RadioWithExplanation label="האם יש עבודת גדר שפוגעת בעירוב?" field="hq_eruv_fence_work" value={data.hq_eruv_fence_work} onChange={set} expected="לא" />
            <RadioWithExplanation label="האם יש שילוט על התקני שבת?" field="hq_shabbat_device_board" value={data.hq_shabbat_device_board} onChange={set} />
          </div>
        </div>
      )}
    </div>
  );
}
