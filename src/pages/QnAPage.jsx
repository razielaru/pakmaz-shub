// src/pages/QnAPage.jsx — יועץ הלכתי AI לשאלות כשרות ושבת
import { useState } from 'react'
import PageLayout from '../components/layout/PageLayout'
import Spinner from '../components/ui/Spinner'

const QUICK_QUESTIONS = [
  'מה הדין אם נפל חלב לסיר בשרי?',
  'מה עושים עם כלי שנאסר?',
  'האם מותר לחמם אוכל בשבת?',
  'מה הכשרה נכונה לגריל?',
  'דין חיילים בצום ביחידה',
  'עירוב בשטח פתוח — מה הכלל?',
  'האם חיילים פטורים מהתפילה?',
  'כשרות ביצים בשטח — מה לבדוק?',
]

const SYSTEM_PROMPT = `אתה רב צבאי מנוסה המתמחה בהלכה צבאית ופיקוד מרכז.
ענה תמיד בעברית בצורה קצרה וברורה לחיילים ומפקדים.
התמקד בהלכה מעשית — מה לעשות בפועל בשטח.
כשרלוונטי, ציין את המקור (שו"ת משיב מלחמה, רב צבאי ראשי וכד').
אל תכנס לפלפולים — תן תשובה מעשית ישירה.`

export default function QnAPage({ embedded }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'שלום! אני הרב הדיגיטלי של פיקוד מרכז. שאל אותי כל שאלה הלכתית הקשורה לשירות הצבאי — כשרות, שבת, תפילה, צומות ועוד.' }
  ])
  const [loading, setLoading] = useState(false)

  async function ask(q) {
    const userQ = q || question.trim()
    if (!userQ) return
    setQuestion('')
    const newMessages = [...messages, { role: 'user', content: userQ }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const answer = data.content?.[0]?.text || 'מצטער, לא הצלחתי לענות כרגע.'
      setMessages([...newMessages, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: '⚠️ שגיאת חיבור. נסה שוב.' }])
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div className="space-y-4 max-w-2xl mx-auto">
      {!embedded && <div className="section-title">📖 יועץ הלכתי AI</div>}

      {/* Chat window */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 min-h-[300px] max-h-[450px] overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-idf-blue text-white rounded-br-none'
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              {m.role === 'assistant' && <span className="text-lg ml-1">🎓</span>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3">
              <Spinner size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => ask(q)} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-idf-blue border border-blue-200 hover:bg-blue-100 transition-all font-medium disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && ask()}
          placeholder="שאל שאלה הלכתית..."
          className="input-field flex-1"
          disabled={loading}
        />
        <button onClick={() => ask()} disabled={loading || !question.trim()}
          className="btn-primary px-5 disabled:opacity-50">
          {loading ? <Spinner size="sm" color="white" /> : '✉️ שלח'}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">
        ⚠️ פסיקות AI אינן תחליף לרב ביחידה. בשאלות דחופות — פנה לרב החטמ"ר.
      </p>
    </div>
  )

  if (embedded) return content
  return <PageLayout title="📖 יועץ הלכתי">{content}</PageLayout>
}
