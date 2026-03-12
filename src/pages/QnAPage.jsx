import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import VideosPage from './VideosPage'

const CATEGORIES = ['כשרות','הגעלה','ניקיון','בדיקת חמץ','הסדר','כללי']

export default function QnAPage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [questions, setQuestions] = useState([])
  const [faqs, setFaqs] = useState([])
  const [globalQ, setGlobalQ] = useState([]) // questions from all units
  const [modal, setModal] = useState(false)
  const [answerModal, setAnswerModal] = useState(null)
  const [form, setForm] = useState({ question:'', category:'כשרות', is_global: false })
  const [answerText, setAnswerText] = useState('')
  const [tab, setTab] = useState('questions')
  const [bookUrl, setBookUrl] = useState('')
  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const [q, f, gq, book] = await Promise.all([
      // My unit's questions
      supabase.from('qna').select('*').eq('unit_id', currentUnit.id)
        .eq('is_faq', false).neq('question','__training_book__').order('created_at',{ascending:false}),
      // FAQ - visible to all
      supabase.from('qna').select('*').eq('is_faq', true)
        .neq('question','__training_book__').order('created_at',{ascending:false}),
      // Global questions (is_global) from all units - visible to admin/senior
      (isAdmin || isSenior)
        ? supabase.from('qna').select('*').eq('is_faq', false)
            .neq('question','__training_book__').order('created_at',{ascending:false})
        : Promise.resolve({ data: [] }),
      // Training book
      supabase.from('qna').select('answer').eq('question','__training_book__').single(),
    ])
    setQuestions(q.data || [])
    setFaqs(f.data || [])
    setGlobalQ(gq.data || [])
    if (book.data?.answer) setBookUrl(book.data.answer)
  }

  async function askQuestion() {
    if (!form.question) return
    await supabase.from('qna').insert({
      unit_id: currentUnit.id, ...form, is_faq: false
    })
    showToast('שאלה נשלחה ✅', 'green')
    setModal(false)
    setForm({ question:'', category:'כשרות', is_global: false })
    load()
  }

  async function saveAnswer() {
    if (!answerText) return
    await supabase.from('qna').update({
      answer: answerText,
      answered_by: currentUnit?.name,
      answered_at: new Date().toISOString(),
      is_faq: true,
    }).eq('id', answerModal.id)
    showToast('תשובה נשמרה ועברה ל-FAQ ✅', 'green')
    setAnswerModal(null); setAnswerText(''); load()
  }

  const myPending = questions.filter(q => !q.answer)
  const myAnswered = questions.filter(q => q.answer)

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">⚖️ חמ"ל הלכתי — שו"ת</h2>
        <button className="btn" onClick={()=>setModal(true)}>+ שאל שאלה</button>
      </div>

      {/* Training book */}
      {bookUrl && (
        <a href={bookUrl} target="_blank" rel="noreferrer"
          className="card p-4 flex items-center gap-3 border-blue-500/30 bg-blue-900/10 hover:border-blue-400/60 transition-all cursor-pointer no-underline block">
          <span className="text-3xl">📚</span>
          <div className="flex-1">
            <div className="font-bold">ספר הכשרות — פסח תשפ"ו</div>
            <div className="text-text3 text-xs">לחץ לפתיחה ←</div>
          </div>
          <span className="badge badge-blue">פתח</span>
        </a>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          ['questions', `❓ שאלות שלי (${myPending.length})`],
          ['faq', '📚 מאגר הלכה (FAQ)'],
          ['videos', '🎥 סרטוני הכשרה'],
          ...(isAdmin || isSenior ? [['all', `📋 כל השאלות (${globalQ.length})`]] : []),
        ].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            className={`ftab ${tab===k?'active':''}`}>{l}</button>
        ))}
      </div>

      {tab === 'videos' && <VideosPage />}

      {/* My questions */}
      {tab === 'questions' && (
        <div className="space-y-3">
          {myPending.length === 0 && myAnswered.length === 0 &&
            <div className="card p-10 text-center text-text3">אין שאלות עדיין</div>}
          {[...myPending, ...myAnswered].map(q => (
            <QuestionCard key={q.id} q={q} canAnswer={isAdmin||isSenior}
              onAnswer={()=>{setAnswerModal(q);setAnswerText('')}} />
          ))}
        </div>
      )}

      {/* FAQ */}
      {tab === 'faq' && (
        <div className="space-y-3">
          {faqs.length === 0 && <div className="card p-10 text-center text-text3">אין שאלות ב-FAQ עדיין</div>}
          {CATEGORIES.map(cat => {
            const catFaqs = faqs.filter(f=>f.category===cat)
            if (!catFaqs.length) return null
            return (
              <div key={cat} className="card">
                <div className="panel-head"><span className="panel-title">⚖️ {cat}</span></div>
                <div className="divide-y divide-border1/50">
                  {catFaqs.map(f => <QuestionCard key={f.id} q={f} canAnswer={false} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All questions (admin) */}
      {tab === 'all' && (isAdmin||isSenior) && (
        <div className="space-y-3">
          {globalQ.filter(q=>q.question!=='__training_book__').map(q => (
            <QuestionCard key={q.id} q={q} canAnswer={true}
              onAnswer={()=>{setAnswerModal(q);setAnswerText(q.answer||'')}} />
          ))}
        </div>
      )}

      {/* Ask Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="❓ שאלה הלכתית">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">נושא</label>
            <select className="form-input" value={form.category}
              onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">השאלה</label>
            <textarea className="form-input h-28 resize-none"
              placeholder="פרט את השאלה בצורה ברורה..."
              value={form.question}
              onChange={e=>setForm(f=>({...f,question:e.target.value}))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_global}
              onChange={e=>setForm(f=>({...f,is_global:e.target.checked}))}
              className="w-4 h-4 accent-gold" />
            <span className="text-sm text-text2">שאלה גלויה לכל היחידות</span>
          </label>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={askQuestion} saveLabel="📤 שלח שאלה" />
      </Modal>

      {/* Answer Modal */}
      <Modal open={!!answerModal} onClose={()=>setAnswerModal(null)} title="✍️ מענה הלכתי">
        {answerModal && (
          <div className="space-y-3">
            <div className="bg-bg3 rounded-lg p-3 text-sm">
              <strong>השאלה:</strong> {answerModal.question}
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">התשובה ההלכתית</label>
              <textarea className="form-input h-32 resize-none"
                placeholder="כתוב את הפסיקה..."
                value={answerText}
                onChange={e=>setAnswerText(e.target.value)} />
            </div>
            <p className="text-text3 text-xs">* התשובה תועבר אוטומטית ל-FAQ ותהיה גלויה לכל היחידות</p>
          </div>
        )}
        <ModalButtons onClose={()=>setAnswerModal(null)} onSave={saveAnswer}
          saveLabel="✅ אשר פסיקה" saveClass="btn-green" />
      </Modal>
    </div>
  )
}

function QuestionCard({ q, canAnswer, onAnswer }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className="badge badge-gold">{q.category}</span>
            {!q.answer && <span className="badge badge-orange">ממתין לתשובה</span>}
            {q.answer && <span className="badge badge-green">נענה ✓</span>}
            {q.is_faq && <span className="badge badge-blue">FAQ</span>}
          </div>
          <p className="font-bold text-sm mb-2">❓ {q.question}</p>
          {q.answer && (
            <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3 mt-2">
              <div className="text-xs text-green-400 font-bold mb-1">✅ תשובה — {q.answered_by}</div>
              <p className="text-sm">{q.answer}</p>
            </div>
          )}
          <div className="text-text3 text-xs mt-2">
            {new Date(q.created_at).toLocaleDateString('he-IL')}
          </div>
        </div>
        {canAnswer && (
          <button className="btn btn-green btn-sm flex-shrink-0" onClick={onAnswer}>
            ✍️ {q.answer ? 'ערוך' : 'ענה'}
          </button>
        )}
      </div>
    </div>
  )
}
