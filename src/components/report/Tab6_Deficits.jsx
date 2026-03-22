import Badge from '../ui/Badge'
import { calculateReliabilityScore } from '../../utils/reliabilityScore'

export default function Tab6_Deficits({ data, onChange }) {
  const { score, flags } = calculateReliabilityScore({ ...data })

  function set(field, value) { onChange(prev => ({ ...prev, [field]: value })) }

  return (
    <div className="space-y-6 py-4">
      <div className="section-title">⚠️ סיכום ושליחה</div>

      {/* Reliability score */}
      <div className={`card border-2 ${score >= 80 ? 'border-green-300 bg-green-50' : score >= 60 ? 'border-yellow-300 bg-yellow-50' : 'border-red-300 bg-red-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800">🎯 ציון אמינות הדוח</h3>
          <span className={`text-3xl font-extrabold ${score >= 80 ? 'text-green-700' : score >= 60 ? 'text-yellow-700' : 'text-red-700'}`}>
            {score}
          </span>
        </div>
        {flags.length > 0 && (
          <ul className="text-xs space-y-1 mt-2">
            {flags.map((f, i) => <li key={i} className="text-orange-700">⚠️ {f}</li>)}
          </ul>
        )}
      </div>

      {/* Report summary */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-800">📋 סיכום הדוח</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">מוצב</p>
            <p className="font-bold">{data.base || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">תאריך</p>
            <p className="font-bold">{data.date || new Date().toLocaleDateString('he-IL')}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 col-span-2">
            <p className="text-xs text-gray-500 mb-1">שעת הדוח</p>
            <p className="font-bold">{data.report_time || new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">עירוב</p>
            <Badge type={data.e_status === 'תקין' ? 'success' : data.e_status === 'פסול' ? 'error' : 'default'}>
              {data.e_status || '—'}
            </Badge>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">כשרות</p>
            <Badge type={data.k_cert === 'כן' ? 'success' : 'error'}>
              {data.k_cert === 'כן' ? 'בתוקף' : data.k_cert === 'לא' ? 'חסרה' : '—'}
            </Badge>
          </div>
          {data.gps_status && (
            <div className="bg-gray-50 rounded-xl p-3 col-span-2">
              <p className="text-xs text-gray-500 mb-1">סטטוס GPS</p>
              <p className="font-bold">{data.gps_status}</p>
            </div>
          )}
          {data.r_mezuzot_missing > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 col-span-2">
              <p className="text-xs text-amber-600 mb-1">מזוזות חסרות</p>
              <p className="font-bold text-amber-800">{data.r_mezuzot_missing}</p>
            </div>
          )}
        </div>
      </div>

      {/* Inspector rating */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-700">⭐ דירוג כללי מהמבקר</h3>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => set('overall_rating', n)}
              className={`text-3xl transition-transform hover:scale-110 ${data.overall_rating >= n ? 'opacity-100' : 'opacity-30'}`}>
              ⭐
            </button>
          ))}
        </div>
      </div>

      {/* Additional fields */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-700">📎 פרטים נוספים</h3>
        <div>
          <label className="label">תגית לדוח (אופציונלי)</label>
          <input type="text" value={data.report_tag || ''} onChange={e => set('report_tag', e.target.value)}
            className="input-field" placeholder="למשל: בקר, ערב, שבת..." />
        </div>
        <div>
          <label className="label">תמונת ראיה (אופציונלי)</label>
          <input type="file" accept="image/*" capture="environment"
            onChange={e => set('evidence_photo', e.target.files[0])}
            className="input-field text-sm" />
        </div>
      </div>
    </div>
  )
}
