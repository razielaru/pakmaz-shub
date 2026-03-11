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

export default function Tab2_Lounge({ data, onChange }) {
  function set(field, value) { onChange({ ...data, [field]: value }) }

  return (
    <div className="space-y-6 py-4">
      {/* טרקלין */}
      <div className="card space-y-4">
        <div className="section-title">☕ טרקלין</div>
        <YesNo label="חדר פרטי זמין לרב" field="t_private" value={data.t_private} onChange={set} />
        <YesNo label="כלי מטבח ייעודיים בטרקלין" field="t_kitchen_tools" value={data.t_kitchen_tools} onChange={set} />
        <YesNo label="נוהל טרקלין מוסדר" field="t_procedure" value={data.t_procedure} onChange={set} />
        <YesNo label="הכנות יום שישי מתבצעות" field="t_friday" value={data.t_friday} onChange={set} />
        <YesNo label="אפליקציה מותקנת ופעילה" field="t_app" value={data.t_app} onChange={set} />
      </div>

      {/* וויקוק */}
      <div className="card space-y-4">
        <div className="section-title">🔧 וויקוק</div>
        <div>
          <label className="label">מיקום תחנת וויקוק</label>
          <input type="text" value={data.w_location || ''} onChange={e => set('w_location', e.target.value)}
            className="input-field" placeholder="תאר את המיקום..." />
        </div>
        <YesNo label="פרטיות מובטחת בוויקוק" field="w_private" value={data.w_private} onChange={set} />
        <YesNo label="כלי מטבח ייעודיים בוויקוק" field="w_kitchen_tools" value={data.w_kitchen_tools} onChange={set} />
        <YesNo label="נוהל וויקוק מוסדר" field="w_procedure" value={data.w_procedure} onChange={set} />
        <YesNo label="הנחיות וויקוק תלויות" field="w_guidelines" value={data.w_guidelines} onChange={set} />
      </div>

      {/* הגנ"ש */}
      <div className="card space-y-4">
        <div className="section-title">🏢 הגנ"ש</div>
        <YesNo label="הגנ"ש קיים ומתפקד" field="hagnash_exists" value={data.hagnash_exists} onChange={set} />
        <YesNo label="כשרות הגנ"ש בתוקף" field="hagnash_kashrut" value={data.hagnash_kashrut} onChange={set} />
        {data.hagnash_kashrut === 'לא' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            🚨 כשרות הגנ"ש לא בתוקף — יש לטפל מיידית
          </div>
        )}
        <div>
          <label className="label">הערות הגנ"ש</label>
          <textarea value={data.hagnash_notes || ''} onChange={e => set('hagnash_notes', e.target.value)}
            className="input-field min-h-[60px] resize-none" placeholder="הערות..." />
        </div>
      </div>

      {/* פילבוקס */}
      <div className="card space-y-4">
        <div className="section-title">💊 פילבוקס</div>
        <YesNo label="פילבוקס קיים" field="pillbox_exists" value={data.pillbox_exists} onChange={set} />
        <YesNo label="תכשירים בכשרות" field="pillbox_kashrut" value={data.pillbox_kashrut} onChange={set} />
        <div>
          <label className="label">הערות פילבוקס</label>
          <input type="text" value={data.pillbox_notes || ''} onChange={e => set('pillbox_notes', e.target.value)}
            className="input-field" placeholder="הערות..." />
        </div>
      </div>
    </div>
  )
}
