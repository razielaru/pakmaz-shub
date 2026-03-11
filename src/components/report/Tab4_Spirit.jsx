function YesNo({ label, field, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      <div className="flex gap-3">
        {['כן', 'לא'].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(field, opt)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
              value === opt
                ? opt === 'כן' ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-white'
            }`}>
            {opt === 'כן' ? '✅ כן' : '❌ לא'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Tab4_Spirit({ data, onChange }) {
  function set(field, value) { onChange({ ...data, [field]: value }) }

  return (
    <div className="space-y-6 py-4">
      <div className="section-title">💎 נהלים ורוח</div>

      {/* שיעור תורה */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">📖 שיעור תורה</h3>
        <YesNo label="חיילים מעוניינים בשיעור תורה" field="soldier_want_lesson" value={data.soldier_want_lesson} onChange={set} />
        <YesNo label="קיים שיעור תורה קבוע" field="soldier_has_lesson" value={data.soldier_has_lesson} onChange={set} />
        {data.soldier_has_lesson === 'כן' && (
          <>
            <div>
              <label className="label">שם המלמד</label>
              <input type="text" value={data.soldier_lesson_teacher || ''} onChange={e => set('soldier_lesson_teacher', e.target.value)}
                className="input-field" placeholder="שם מלא..." />
            </div>
            <div>
              <label className="label">טלפון מלמד</label>
              <input type="tel" value={data.soldier_lesson_phone || ''} onChange={e => set('soldier_lesson_phone', e.target.value)}
                className="input-field" placeholder="05X-XXXXXXX" dir="ltr" />
            </div>
          </>
        )}
        <div>
          <label className="label">ישיבה מחוברת (אם יש)</label>
          <input type="text" value={data.soldier_yeshiva || ''} onChange={e => set('soldier_yeshiva', e.target.value)}
            className="input-field" placeholder="שם הישיבה..." />
        </div>
      </div>

      {/* רוח */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">🌟 רוח וסביבה</h3>
        <div>
          <label className="label">רוח כללית של היחידה</label>
          <select value={data.spirit_general || ''} onChange={e => set('spirit_general', e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {['גבוהה מאוד', 'גבוהה', 'בינונית', 'נמוכה', 'בעייתית'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="label">איכות שבת ביחידה</label>
          <select value={data.shabbat_quality || ''} onChange={e => set('shabbat_quality', e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {['מצוינת', 'טובה', 'בינונית', 'לוקה בחסר', 'גרועה'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="label">רמת קשר עם הרב</label>
          <select value={data.rabbi_contact || ''} onChange={e => set('rabbi_contact', e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {['טוב מאוד', 'טוב', 'בינוני', 'חסר', 'לא קיים'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <YesNo label="תפילין זמינות לחיילים" field="tefillin_available" value={data.tefillin_available} onChange={set} />
      </div>

      {/* נהלים */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">📋 נהלים</h3>
        <YesNo label="נוהל שבת קיים ומוכר" field="shabbat_procedure" value={data.shabbat_procedure} onChange={set} />
        <YesNo label="חיילים מודעים לנוהל כשרות" field="soldiers_aware" value={data.soldiers_aware} onChange={set} />
        <YesNo label="קיים תיאום עם קצין הדת" field="religion_officer" value={data.religion_officer} onChange={set} />
      </div>

      {/* הערות חופשיות */}
      <div className="card">
        <label className="label">📝 הערות חופשיות ותרשומות</label>
        <textarea
          value={data.free_text || ''}
          onChange={e => set('free_text', e.target.value)}
          className="input-field min-h-[100px] resize-none"
          placeholder="רשום כאן כל הערה, תצפית, או נקודה לטיפול שלא נכללה בשאלות הסגורות..."
        />
      </div>
    </div>
  )
}
