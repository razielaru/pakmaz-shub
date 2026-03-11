import GPSCheckpoint from './GPSCheckpoint'

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

export default function Tab3_Synagogue({ data, onChange }) {
  function set(field, value) { onChange({ ...data, [field]: value }) }

  return (
    <div className="space-y-6 py-4">
      <div className="section-title">🕍 בית כנסת ועירוב</div>

      <GPSCheckpoint checkpointNum={2} base={data.base || 'unknown'} onCapture={pos => {
        set('gps_shul_lat', pos.lat)
        set('gps_shul_lon', pos.lon)
      }} />

      {/* עירוב */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">🔵 עירוב</h3>
        <div>
          <label className="label">סטטוס עירוב</label>
          <select value={data.e_status_shul || ''} onChange={e => set('e_status_shul', e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {['תקין', 'פסול', 'לא קיים', 'בבנייה'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {data.e_status_shul === 'פסול' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            🚨 עירוב פסול בבית הכנסת — יש לתקן לפני שבת!
          </div>
        )}
        <div>
          <label className="label">הערות עירוב</label>
          <input type="text" value={data.eruv_notes || ''} onChange={e => set('eruv_notes', e.target.value)}
            className="input-field" placeholder="הערות על מצב העירוב..." />
        </div>
      </div>

      {/* ס"ת */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">📜 ספר תורה</h3>
        <YesNo label="ס\"ת מזוהה ורשום" field="s_torah_id" value={data.s_torah_id} onChange={set} />
        <div>
          <label className="label">נוסח הס"ת</label>
          <select value={data.s_torah_nusach || ''} onChange={e => set('s_torah_nusach', e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {['אשכנז', 'ספרד', 'ספרדי', 'תימני', 'אחר'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <YesNo label="ס\"ת חסרים" field="r_torah_missing" value={data.r_torah_missing} onChange={set} />
        {data.r_torah_missing === 'כן' && (
          <div>
            <label className="label">פירוט חוסרי ס"ת</label>
            <input type="text" value={data.torah_missing_details || ''} onChange={e => set('torah_missing_details', e.target.value)}
              className="input-field" placeholder="כמה וסוג..." />
          </div>
        )}
      </div>

      {/* מזוזות */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">📌 מזוזות</h3>
        <div>
          <label className="label">מספר מזוזות חסרות</label>
          <input
            type="number" min="0" max="99"
            value={data.r_mezuzot_missing || ''}
            onChange={e => set('r_mezuzot_missing', e.target.value)}
            className="input-field text-lg font-bold"
            placeholder="0"
          />
          {parseInt(data.r_mezuzot_missing || 0) >= 5 && (
            <p className="text-xs text-amber-600 mt-1">⚠️ יותר מ-5 מזוזות חסרות — תישלח התראה</p>
          )}
        </div>
        <div>
          <label className="label">מיקום מזוזות חסרות</label>
          <input type="text" value={data.mezuzot_location || ''} onChange={e => set('mezuzot_location', e.target.value)}
            className="input-field" placeholder="פרט אילו דלתות..." />
        </div>
      </div>

      {/* חוסרים כלליים */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">📦 ציוד וחוסרים</h3>
        <div>
          <label className="label">מספר סידורים זמינים</label>
          <input type="number" min="0" value={data.siddur_qty || ''} onChange={e => set('siddur_qty', e.target.value)}
            className="input-field" placeholder="כמות..." />
        </div>
        <div>
          <label className="label">מצב בית הכנסת</label>
          <select value={data.shul_condition || ''} onChange={e => set('shul_condition', e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {['טוב', 'בינוני', 'גרוע', 'דורש שיפוץ'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="label">חוסרים נוספים</label>
          <textarea value={data.missing_items || ''} onChange={e => set('missing_items', e.target.value)}
            className="input-field min-h-[70px] resize-none" placeholder="פרט חוסרים..." />
        </div>
      </div>
    </div>
  )
}
