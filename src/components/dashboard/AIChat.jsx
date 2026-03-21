// src/components/dashboard/AIChat.jsx
// עוזר AI — Gemini Chatbot עם הקשר דוחות היחידה

import { useState, useRef, useEffect, useMemo } from 'react'

async function callGemini(messages, systemPrompt) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt, mode: 'chat' })
  })
  if (!res.ok) throw new Error('שגיאה בחיבור לשרת AI')
  const data = await res.json()
  return data.text
}

function buildSystemPrompt(reports, unit) {
  const total      = reports.length
  const noEruv     = reports.filter(r => r.e_status === 'פסול').length
  const noCert     = reports.filter(r => r.k_cert === 'לא').length
  const suspicious = reports.filter(r => r.gps_suspicious).length

  const bases = [...new Set(reports.map(r => r.base).filter(Boolean))]
  const inspectors = [...new Set(reports.map(r => r.inspector).filter(Boolean))]

  return `אתה עוזר AI של מערכת רבנות פיקוד מרכז.
יחידה: ${unit || 'לא ידוע'}
נתוני מערכת: ${total} דוחות | ${noEruv} עם עירוב פסול | ${noCert} ללא תעודת כשרות | ${suspicious} חשודים
מוצבים במערכת: ${bases.slice(0, 20).join(', ')}
מבקרים פעילים: ${inspectors.slice(0, 10).join(', ')}

ענה תמיד בעברית. השתמש בשפה צבאית-מקצועית.
כשנשאלים על דוחות — הסתמך על הנתונים הסטטיסטיים שלמעלה.
לשאלות הלכה — ענה בקצרה ופנה לרב הגדוד לבירור מעמיק.`
}

const SUGGESTIONS = [
  'מה המצב הכולל של היחידה?',
  'אילו מוצבים דורשים ביקורת דחופה?',
  'מהן בעיות הכשרות הנפוצות?',
  'מה דין חלב שהתבשל עם בשר בשוגג?',
  'כמה דוחות הוגשו החודש?',
  'מי המבקרים הפעילים ביותר?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 ${
        isUser ? 'bg-idf-blue text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-idf-blue text-white rounded-tr-sm'
          : 'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-800 dark:text-dark-text rounded-tl-sm'
      }`}
        dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>')
        }}
      />
    </div>
  )
}

export default function AIChat({ reports = [], unit }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `שלום! אני העוזר AI של מערכת רבנות פיקוד מרכז 🤖\nאני יכול לענות על שאלות לגבי הדוחות של ${unit || 'היחידה'}, הלכה, ומידע כללי.\nמה אוכל לעזור לך?`
    }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef(null)

  const systemPrompt = useMemo(() => buildSystemPrompt(reports, unit), [reports, unit])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      // שלח רק הודעות user/assistant (לא את ה-system)
      const history = newMessages.filter(m => m.role !== 'system')
      const reply = await callGemini(history, systemPrompt)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ שגיאה: ${e.message}`
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-[600px] animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-l from-purple-700 to-idf-blue text-white p-4 rounded-t-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🤖</div>
        <div>
          <h2 className="font-bold text-lg">עוזר AI</h2>
          <p className="text-blue-200 text-xs">{reports.length} דוחות טעונים · Gemini 1.5 Flash</p>
        </div>
        <button
          onClick={() => setMessages([{
            role: 'assistant',
            content: `שיחה חדשה התחילה. ${reports.length} דוחות טעונים. מה אוכל לעזור?`
          }])}
          className="mr-auto text-xs text-white/70 hover:text-white border border-white/30 rounded-lg px-2 py-1 transition-all"
        >
          🗑️ נקה
        </button>
      </div>

      {/* הצעות מהירות (רק בהתחלה) */}
      {messages.length <= 1 && (
        <div className="p-3 bg-gray-50 dark:bg-dark-surface2 border-b border-gray-200 dark:border-dark-border">
          <p className="text-xs text-gray-500 dark:text-dark-muted mb-2 font-semibold">שאלות נפוצות:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-idf-blue/30 text-idf-blue dark:text-dark-blue bg-blue-50 dark:bg-dark-surface hover:bg-idf-blue hover:text-white transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* הודעות */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-surface">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm">🤖</div>
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* שדה קלט */}
      <div className="p-3 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border rounded-b-2xl">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="שאל שאלה... (Enter לשליחה)"
            rows={1}
            disabled={loading}
            className="flex-1 input-field text-sm resize-none py-2 min-h-[38px] max-h-[100px]"
            style={{ direction: 'rtl' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-40 shrink-0"
          >
            שלח ➤
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-dark-muted mt-1 text-center">
          Enter לשליחה · Shift+Enter לשורה חדשה
        </p>
      </div>
    </div>
  )
}
