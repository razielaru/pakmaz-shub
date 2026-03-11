import { useState, useEffect } from 'react'
import { useBaseReports } from '../../hooks/useReports'

export default function ContinuityQuestions({ base, unit, onChange }) {
  const { data: reports } = useBaseReports(base, unit)
  const [answers, setAnswers] = useState({})

  const last = reports?.[0]
  if (!last) return null

  // Build continuity questions from previous report issues
  const questions = []
  if (last.e_status === 'פסול') {
    questions.push({ key: 'cont_eruv', label: 'האם עירוב תוקן?', prev: 'עירוב היה פסול', icon: '🔴' })
  }
  if (last.k_cert === 'לא') {
    questions.push({ key: 'cont_kcert', label: 'האם תעודת כשרות הוסדרה?', prev: 'לא היתה תעודה', icon: '📋' })
  }
  if (parseInt(last.r_mezuzot_missing || 0) >= 3) {
    questions.push({ key: 'cont_mezuzot', label: 'האם המזוזות הוחלפו/נקנו?', prev: `${last.r_mezuzot_missing} מזוזות חסרו`, icon: '📜' })
  }
  if (last.p_mix === 'כן') {
    questions.push({ key: 'cont_mix', label: 'האם ערבוב הכלים תוקן?', prev: 'היה ערבוב כלים', icon: '⚠️' })
  }

  if (questions.length === 0) return null

  function handleAnswer(key, val) {
    const updated = { ...answers, [key]: val }
    setAnswers(updated)
    onChange?.(updated)
  }

  return (
    <div className="card border-2 border-amber-300 bg-amber-50 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔁</span>
        <div>
          <h3 className="font-bold text-amber-800">שאלות המשכיות</h3>
          <p className="text-xs text-amber-600">מהבדיקה הקודמת — {last.date}</p>
        </div>
      </div>

      {questions.map(q => (
        <div key={q.key} className="bg-white rounded-xl p-4 border border-amber-200">
          <div className="flex items-start gap-2 mb-3">
            <span>{q.icon}</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">{q.label}</p>
              <p className="text-xs text-gray-500">רקע: {q.prev}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {['כן', 'לא', 'בחלקו'].map(opt => (
              <button
                key={opt}
                onClick={() => handleAnswer(q.key, opt)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                  answers[q.key] === opt
                    ? opt === 'כן' ? 'bg-green-100 border-green-500 text-green-800'
                      : opt === 'לא' ? 'bg-red-100 border-red-500 text-red-800'
                      : 'bg-yellow-100 border-yellow-500 text-yellow-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {answers[q.key] === 'לא' && (
            <p className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2">
              ⚠️ שים לב: ליקוי פתוח לא תוקן — יצור ליקוי חוזר במערכת
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
