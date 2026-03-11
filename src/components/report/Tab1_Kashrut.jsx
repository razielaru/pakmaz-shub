import { useState } from 'react'
import GPSCheckpoint from './GPSCheckpoint'

function YesNo({ label, field, value, onChange, required }) {
  return (
    <div className="space-y-1.5">
      <label className="label flex items-center gap-1">
        {required && <span className="text-red-500">*</span>}
        {label}
      </label>
      <div className="flex gap-3">
        {['כן', 'לא'].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(field, opt)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
              value === opt
                ? opt === 'כן' ? 'bg-green-500 border-green-500 text-white shadow-md'
                  : 'bg-red-500 border-red-500 text-white shadow-md'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-white'
            }`}
          >
            {opt === 'כן' ? '✅ כן' : '❌ לא'}
          </button>
        ))}
      </div>
    </div>
  )
}

function SelectField({ label, field, value, onChange, options, required }) {
  return (
    <div className="space-y-1.5">
      <label className="label">
        {required && <span className="text-red-500 ml-1">*</span>}
        {label}
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
        className="select-field"
      >
        <option value="">— בחר —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function Tab1_Kashrut({ data, onChange, unit }) {
  function set(field, value) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6 py-4">
      <div className="section-title">🥩 כשרות — בדיקה ראשית</div>

      {/* GPS */}
      <GPSCheckpoint checkpointNum={1} base={data.base || 'unknown'} onCapture={pos => {
        set('gps_lat', pos.lat)
        set('gps_lon', pos.lon)
      }} />

      {/* תעודת כשרות */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">📋 תעודת כשרות</h3>
        <YesNo label="תעודת כשרות בתוקף" field="k_cert" value={data.k_cert} onChange={set} required />
        {data.k_cert === 'כן' && (
          <div>
            <label className="label">תאריך תפוגה</label>
            <input type="date" value={data.k_cert_expiry || ''} onChange={e => set('k_cert_expiry', e.target.value)} className="input-field" />
          </div>
        )}
        {data.k_cert === 'לא' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            🚨 חסר תעודה — תישלח התראה אוטומטית לרב החטמ"ר
          </div>
        )}
      </div>

      {/* עירוב */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">🔵 עירוב</h3>
        <SelectField
          label="סטטוס עירוב במטבח"
          field="e_status"
          value={data.e_status}
          onChange={set}
          options={['תקין', 'פסול', 'לא רלוונטי']}
          required
        />
        {data.e_status === 'פסול' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            🚨 עירוב פסול — נדרש טיפול דחוף!
          </div>
        )}
      </div>

      {/* תקלות כשרות */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">⚠️ תקלות ועירובי כלים</h3>
        <YesNo label="תקלות כשרות" field="k_issues" value={data.k_issues} onChange={set} />
        {data.k_issues === 'כן' && (
          <div>
            <label className="label">פירוט התקלה</label>
            <textarea
              value={data.k_issues_description || ''}
              onChange={e => set('k_issues_description', e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="תאר את התקלה בפירוט..."
            />
          </div>
        )}
        <YesNo label="הפרדה בין חלבי/בשרי" field="k_separation" value={data.k_separation} onChange={set} />
        <YesNo label="ערבוב כלים" field="p_mix" value={data.p_mix} onChange={set} />
        {data.p_mix === 'כן' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
            ⚠️ ערבוב כלים — יש לתת הנחיות מיידיות
          </div>
        )}
      </div>

      {/* מוצרים ובישול */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">🍳 מוצרים ובישול</h3>
        <YesNo label="מוצרים בעייתיים" field="k_products" value={data.k_products} onChange={set} />
        <YesNo label="בישול ישראל" field="k_bishul" value={data.k_bishul} onChange={set} />
        <YesNo label="חלב ישראל" field="k_chalav" value={data.k_chalav} onChange={set} />
        <YesNo label="לחם בכשרות מתאימה" field="k_bread" value={data.k_bread} onChange={set} />
      </div>

      {/* שבת */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">🕯️ שבת</h3>
        <YesNo label="שמירת חום לשבת מוסדרת" field="k_shabbat_hot" value={data.k_shabbat_hot} onChange={set} />
        <div>
          <label className="label">תמונת נאמן כשרות (אופציונלי)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => set('k_shabbat_photo', e.target.files[0])}
            className="input-field text-sm"
          />
        </div>
      </div>

      {/* Inspector tip */}
      <div className="card">
        <label className="label">💡 טיפ / הערת מבקר (יועבר לבדיקה הבאה)</label>
        <textarea
          value={data.inspector_tip || ''}
          onChange={e => set('inspector_tip', e.target.value)}
          className="input-field min-h-[70px] resize-none"
          placeholder="הערה שתעזור למבקר הבא..."
        />
      </div>
    </div>
  )
}
