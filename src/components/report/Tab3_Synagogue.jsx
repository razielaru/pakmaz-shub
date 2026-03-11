// src/components/report/Tab3_Synagogue.jsx
import { useAuth } from '../../context/AuthContext';
import RadioWithExplanation from './RadioWithExplanation';

export default function Tab3_Synagogue({ data, onChange }) {
  const { user } = useAuth();
  function set(field, value) { onChange(prev => ({ ...prev, [field]: value })); }

  const isCombatBrigade = ["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(user?.unit);

  const handleBookToggle = (book) => {
    const current = data.s_books ? data.s_books.split(',') : [];
    if (current.includes(book)) {
      set('s_books', current.filter(b => b !== book).join(','));
    } else {
      set('s_books', [...current, book].join(','));
    }
  };

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="section-title">🕍 בית כנסת ועירוב</div>

      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">ספר תורה וספרים</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">מס' צ' של ספר התורה</label>
            <input type="text" className="input-field" placeholder="לדוגמה: 12345" value={data.s_torah_id || ''} onChange={e => set('s_torah_id', e.target.value)} />
          </div>
          <div>
            <label className="label">נוסח ספר התורה</label>
            <select className="select-field" value={data.s_torah_nusach || ''} onChange={e => set('s_torah_nusach', e.target.value)}>
              <option value="">— בחר —</option><option>ספרדי</option><option>אשכנז</option><option>תימן</option><option>אחר</option><option>לא ידוע</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="label">ספרי יסוד קיימים:</label>
          <div className="flex flex-wrap gap-2">
            {["תורת המחנה", "לוח דינים", "הלכה כסדרה", "שו״ת משיב מלחמה"].map(book => {
              const isActive = data.s_books?.includes(book);
              return (
                <button 
                  key={book} type="button" onClick={() => handleBookToggle(book)}
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg border-2 transition-all ${isActive ? 'bg-idf-blue text-white border-idf-blue' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                >
                  {isActive ? '✓ ' : '+ '}{book}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card space-y-4">
         <h3 className="font-bold text-gray-800 border-b pb-2">תשתיות וציוד ביה"כ</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="האם לוח רבנות מעודכן?" field="s_board" value={data.s_board} onChange={set} />
            <RadioWithExplanation label="האם בית הכנסת נקי?" field="s_clean" value={data.s_clean} onChange={set} />
            <RadioWithExplanation label="האם יש ערכת הבדלה והדלקת נרות?" field="s_havdala" value={data.s_havdala} onChange={set} />
            <RadioWithExplanation label="האם יש גמ״ח טלית ותפילין?" field="s_gemach" value={data.s_gemach} onChange={set} />
            <RadioWithExplanation label="האם יש תקלת בינוי (סמארט-ביס)?" field="s_smartbis" value={data.s_smartbis} onChange={set} expected="לא" />
            <RadioWithExplanation label="האם יש פח גניזה?" field="s_geniza" value={data.s_geniza} onChange={set} />
         </div>
      </div>

      {isCombatBrigade && (
        <div className="card space-y-4 bg-blue-50/30 border-blue-100">
           <h3 className="font-bold text-blue-800 border-b border-blue-200 pb-2">📋 לוח רבנות מורחב (סדיר)</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="לוח מכיל: לוז שבת, מפת עירוב, לוז ישיבה?" field="hq_board_info" value={data.hq_board_info} onChange={set} />
              <RadioWithExplanation label="האם קיימת עמדת טלית ותפילין?" field="hq_tefillin_stand" value={data.hq_tefillin_stand} onChange={set} />
           </div>
        </div>
      )}

      <div className={`card space-y-4 border-2 ${data.e_status === 'פסול' ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
         <h3 className={`font-bold border-b pb-2 ${data.e_status === 'פסול' ? 'text-red-800 border-red-200' : 'text-gray-800'}`}>🚧 מערך העירוב</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
         </div>
      </div>

      {isCombatBrigade && (
        <div className="card space-y-4 bg-amber-50/30 border-amber-100">
           <h3 className="font-bold text-amber-800 border-b border-amber-200 pb-2">🔗 עירוב מורחב (סדיר)</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="האם קיימת צורת הפתח לעירוב?" field="hq_eruv_door" value={data.hq_eruv_door} onChange={set} />
              <RadioWithExplanation label="האם יש עבודת גדר שפוגעת בעירוב?" field="hq_eruv_fence" value={data.hq_eruv_fence} onChange={set} expected="לא" />
              <RadioWithExplanation label="האם יש שילוט על התקני שבת?" field="hq_sdb" value={data.hq_sdb} onChange={set} />
           </div>
        </div>
      )}
    </div>
  )
}
