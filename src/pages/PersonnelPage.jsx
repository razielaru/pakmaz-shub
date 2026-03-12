// PersonnelPage.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import ImportPage from './ImportPage'
import SederPage from './SederPage'

const STATUS_LABEL = { available:'זמין', zoom:'זום', away:'הגב', leave:'שחרור' }
const STATUS_CLS   = { available:'badge-green', zoom:'badge-blue', away:'badge-orange', leave:'badge-red' }
const TR_LABEL     = { none:'טרם', active:'בהכשרה', done:'הוכשר' }
const TR_CLS       = { none:'badge-dim', active:'badge-orange', done:'badge-green' }

export function PersonnelPage() {
  const { currentUnit, showToast, isAdmin, isSenior } = useStore()
  const [people, setPeople] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', role:'סגל', status:'available', training_status:'none' })
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('personnel')

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const { data } = await supabase.from('personnel').select('*').eq('unit_id', currentUnit.id).order('name')
    setPeople(data || [])
  }
  async function save() {
    if (!form.name) return
    await supabase.from('personnel').insert({ unit_id: currentUnit.id, ...form })
    showToast(`${form.name} נוסף ✅`, 'green')
    setModal(false); setForm({ name:'', role:'סגל', status:'available', training_status:'none' }); load()
  }
  async function setStatus(id, status) {
    await supabase.from('personnel').update({ status }).eq('id', id)
    setPeople(p => p.map(x => x.id===id ? {...x,status} : x))
  }
  async function remove(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('personnel').delete().eq('id', id)
    load()
  }

  const counts = { available:0, zoom:0, away:0, leave:0 }
  people.forEach(p => { if (counts[p.status]!==undefined) counts[p.status]++ })
  const filtered = search ? people.filter(p=>p.name.includes(search)||p.role.includes(search)) : people

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setTab('personnel')} className={`ftab ${tab==='personnel'?'active':''}`}>👥 כוח אדם</button>
        <button onClick={()=>setTab('seder')} className={`ftab ${tab==='seder'?'active':''}`}>🕍 שיבוצי ליל הסדר</button>
        {(isAdmin||isSenior) && <button onClick={()=>setTab('import')} className={`ftab ${tab==='import'?'active':''}`}>📊 ייבוא אקסל</button>}
      </div>

      {tab === 'seder' && <SederPage />}
      {tab === 'import' && <ImportPage />}

      {tab === 'personnel' && (<>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">👥 כוח אדם ומילואים</h2>
        <div className="flex gap-2">
          <input className="form-input w-44" placeholder="חיפוש..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn" onClick={()=>setModal(true)}>+ הוסף</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="זמין" value={counts.available} color="green" />
        <KpiCard label="זום" value={counts.zoom} color="blue" />
        <KpiCard label="הגב" value={counts.away} color="orange" />
        <KpiCard label="שחרור" value={counts.leave} color="red" />
      </div>
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-bg4 flex items-center justify-center text-lg flex-shrink-0">
              {p.role==='מכשיר'?'🎓':p.role==='ביינש'?'⚖️':p.role==='עורך סדר'?'📜':p.role==='רב'?'✡️':p.role==='קצין בקרה'?'🔍':'👤'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-text3 text-xs">{p.role}</div>
            </div>
            <span className={`badge ${TR_CLS[p.training_status]}`}>{TR_LABEL[p.training_status]}</span>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(STATUS_LABEL).map(([k,l]) => (
                <button key={k} onClick={()=>setStatus(p.id,k)}
                  className={`badge cursor-pointer transition-all ${p.status===k ? STATUS_CLS[k] : 'badge-dim opacity-50 hover:opacity-100'}`}>
                  {l}
                </button>
              ))}
            </div>
            <button className="btn btn-red btn-sm" onClick={()=>remove(p.id)}>🗑</button>
          </div>
        ))}
        {filtered.length === 0 && <div className="card p-8 text-center text-text3">אין אנשים</div>}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="➕ הוספת איש צוות">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs text-text3 font-bold block mb-1">שם + דרגה</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">תפקיד</label>
            <select className="form-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              <option>מכשיר</option><option>ביינש</option><option>עורך סדר</option><option>קצ"ש</option><option>רב</option><option>קצין בקרה</option><option>סגל</option>
            </select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">סטטוס</label>
            <select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="available">זמין</option><option value="zoom">זום</option><option value="away">הגב</option><option value="leave">שחרור</option>
            </select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">הכשרה</label>
            <select className="form-input" value={form.training_status} onChange={e=>setForm(f=>({...f,training_status:e.target.value}))}>
              <option value="none">טרם</option><option value="active">בהכשרה</option><option value="done">הוכשר</option>
            </select></div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="הוסף" />
      </Modal>
      </>)}
    </div>
  )
}

export default PersonnelPage
