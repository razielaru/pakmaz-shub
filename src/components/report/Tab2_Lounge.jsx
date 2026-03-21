// src/components/report/Tab2_Lounge.jsx
import { useAuth } from '../../context/AuthContext';
import RadioWithExplanation from './RadioWithExplanation';

export default function Tab2_Lounge({ data, onChange }) {
  const { user } = useAuth();
  function set(field, value) { onChange(prev => ({ ...prev, [field]: value })); }

  const isCombatBrigade = ["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(user?.unit);

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="section-title">☕ טרקלין, WeCook ונקודות קצה</div>

      {!isCombatBrigade ? (
        <>
          <div className="card space-y-4 bg-orange-50/30 border-orange-100">
            <h3 className="font-bold text-orange-800 border-b border-orange-200 pb-2">☕ טרקלין</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="האם יש כלים פרטיים?" field="t_private" value={data.t_private} onChange={set} />
              <RadioWithExplanation label="האם יש כלי מטבח?" field="t_kitchen_tools" value={data.t_kitchen_tools} onChange={set} />
              <RadioWithExplanation label="האם נשמר נוהל סגירה?" field="t_procedure" value={data.t_procedure} onChange={set} />
              <RadioWithExplanation label="האם הכלים החשמליים סגורים בשבת?" field="t_friday" value={data.t_friday} onChange={set} />
              <RadioWithExplanation label="האם מולאה אפליקציה לטרקלין?" field="t_app" value={data.t_app} onChange={set} />
            </div>
          </div>

          <div className="card space-y-4 bg-blue-50/30 border-blue-100">
            <h3 className="font-bold text-blue-800 border-b border-blue-200 pb-2">🍳 WeCook / ויקוק</h3>
            <div>
              <label className="label">מיקום הוויקוק</label>
              <input type="text" className="input-field" value={data.w_location || ''} onChange={e => set('w_location', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="האם יש כלים פרטיים בוויקוק?" field="w_private" value={data.w_private} onChange={set} />
              <RadioWithExplanation label="האם יש כלי מטבח בוויקוק?" field="w_kitchen_tools" value={data.w_kitchen_tools} onChange={set} />
              <RadioWithExplanation label="האם עובד לפי פקודה?" field="w_procedure" value={data.w_procedure} onChange={set} />
              <RadioWithExplanation label="האם יש הנחיות?" field="w_guidelines" value={data.w_guidelines} onChange={set} />
            </div>
          </div>

          <div className="card space-y-4 bg-green-50/30 border-green-100">
            <h3 className="font-bold text-green-800 border-b border-green-200 pb-2">🏠 פילבוקס / הגנ״ש</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RadioWithExplanation label="האם יש פק״ל רבנות?" field="p_pakal" value={data.p_pakal} onChange={set} />
              <RadioWithExplanation label="האם הכלים מסומנים?" field="p_marked" value={data.p_marked} onChange={set} />
              <RadioWithExplanation label="האם זוהה ערבוב כלים?" field="p_mix" value={data.p_mix} onChange={set} />
              <RadioWithExplanation label="האם נדרשת הכשרת כלים?" field="p_kasher" value={data.p_kasher} onChange={set} />
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-10">
           <span className="text-4xl mb-2 block">⚔️</span>
           <p className="font-bold text-gray-700">ביחידות סדירות (קומנדו/צנחנים/כפיר) סעיף זה אינו רלוונטי.</p>
           <p className="text-sm text-gray-500">ניתן לדלג לטאב הבא.</p>
        </div>
      )}
    </div>
  )
}
