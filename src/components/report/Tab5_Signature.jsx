import SignaturePad from './SignaturePad'

export default function Tab5_Signature({ data, onChange }) {
  function set(field, value) { onChange({ ...data, [field]: value }) }

  return (
    <div className="space-y-6 py-4">
      <div className="section-title">✍️ שיחת חתם</div>
      <p className="text-sm text-gray-500">סעיף זה אינו חובה — ניתן לדלג לטאב הבא</p>

      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">💬 שיחת חתם עם מפקד</h3>
        <YesNo label="התקיימה שיחת חתם" field="chatam_held" value={data.chatam_held} onChange={set} />
        {data.chatam_held === 'כן' && (
          <>
            <div>
              <label className="label">שם המפקד</label>
              <input type="text" value={data.chatam_commander || ''} onChange={e => set('chatam_commander', e.target.value)}
                className="input-field" placeholder="שם ודרגה..." />
            </div>
            <div>
              <label className="label">נושאים שעלו בשיחה</label>
              <textarea value={data.chatam_topics || ''} onChange={e => set('chatam_topics', e.target.value)}
                className="input-field min-h-[80px] resize-none" placeholder="פרט את הנושאים..." />
            </div>
            <div>
              <label className="label">התחייבויות המפקד</label>
              <textarea value={data.chatam_commitments || ''} onChange={e => set('chatam_commitments', e.target.value)}
                className="input-field min-h-[60px] resize-none" placeholder="מה המפקד התחייב לעשות..." />
            </div>
          </>
        )}
      </div>

      <div className="card">
        <SignaturePad onSave={sig => set('signature', sig)} />
        {data.signature && (
          <div className="mt-3">
            <p className="text-xs text-green-700 font-semibold">✅ חתימה נשמרה</p>
            <img src={data.signature} alt="חתימה" className="border border-gray-200 rounded-lg mt-1 max-h-24" />
          </div>
        )}
      </div>
    </div>
  )
}

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
