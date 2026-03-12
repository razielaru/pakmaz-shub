import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

// ── קואורדינטות ברירת מחדל לכל יחידה ──────────────────────────────────────
const DEFAULT_COORDS = {
  binyamin:     [31.90, 35.22],
  shomron:      [32.20, 35.20],
  yehuda:       [31.55, 35.10],
  etzion:       [31.65, 35.12],
  efraim:       [32.10, 35.28],
  menashe:      [32.35, 35.10],
  habikaa:      [31.85, 35.45],
  hativa_35:    [31.78, 35.20],
  hativa_89:    [32.05, 34.90],
  hativa_900:   [31.95, 35.00],
  hativa_other: [32.15, 34.95],
  ugdat_877:    [31.70, 35.05],
  ugda_96:      [32.30, 35.05],
  ugda_98:      [31.80, 35.38],
  pikud:        [31.76, 35.21],
}

const HEALTH_COLOR = { green: '#22c55e', orange: '#f97316', red: '#ef4444' }
const HEALTH_LABEL = { green: 'תקין', orange: 'דורש תשומת לב', red: '⚠ קריטי' }

export default function MapView({ unitStats }) {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const [pins, setPins] = useState([]) // custom pins from supabase
  const [selected, setSelected] = useState(null) // selected unit popup
  const [addModal, setAddModal] = useState(false)
  const [clickLatLng, setClickLatLng] = useState(null)
  const [pinForm, setPinForm] = useState({ label: '', note: '', color: 'blue' })

  const canEdit = isAdmin || isSenior
  const nonAdminUnits = UNITS.filter(u => !u.is_admin)

  // ── Load custom pins from Supabase ────────────────────────────────────────
  useEffect(() => { loadPins() }, [])

  async function loadPins() {
    const { data } = await supabase
      .from('map_pins')
      .select('*')
      .order('created_at', { ascending: false })
    setPins(data || [])
  }

  async function savePin() {
    if (!pinForm.label || !clickLatLng) return
    const { error } = await supabase.from('map_pins').insert({
      label: pinForm.label,
      note: pinForm.note,
      color: pinForm.color,
      lat: clickLatLng.lat,
      lng: clickLatLng.lng,
      created_by: currentUnit?.name,
    })
    if (error) { showToast('שגיאה: ' + error.message, 'red'); return }
    showToast('נקודה נוספה ✅', 'green')
    setAddModal(false)
    setPinForm({ label: '', note: '', color: 'blue' })
    loadPins()
  }

  async function deletePin(id) {
    await supabase.from('map_pins').delete().eq('id', id)
    showToast('נקודה נמחקה', 'red')
    loadPins()
  }

  // ── Init Leaflet map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    if (!window.L) { console.error('Leaflet not loaded'); return }

    const L = window.L

    const map = L.map(mapRef.current, {
      center: [31.9, 35.1],
      zoom: 9,
      zoomControl: true,
    })

    // Dark tile layer (CartoDB dark)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    mapInstance.current = map

    // Click to add pin
    map.on('click', (e) => {
      if (!canEdit) return
      setClickLatLng(e.latlng)
      setAddModal(true)
    })

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // ── Draw unit markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L
    if (!L || !mapInstance.current) return
    const map = mapInstance.current

    // Remove old unit markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m))
    markersRef.current = {}

    nonAdminUnits.forEach(u => {
      const coords = DEFAULT_COORDS[u.id]
      if (!coords) return
      const s = unitStats[u.id] || {}
      const h = s.health || 'orange'
      const color = HEALTH_COLOR[h]

      // Custom SVG marker
      const svgIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            position:relative;
            width:44px;
            text-align:center;
          ">
            <div style="
              background:${color};
              color:#000;
              font-weight:900;
              font-size:11px;
              padding:3px 6px;
              border-radius:6px;
              border:2px solid rgba(0,0,0,0.4);
              white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.5);
              min-width:52px;
              text-align:center;
            ">${u.icon} ${u.name.replace('חטמ"ר ','').replace('חטיבה ','חט ').replace('אוגדת ','אוג ')}</div>
            <div style="
              width:0;height:0;
              border-left:6px solid transparent;
              border-right:6px solid transparent;
              border-top:8px solid ${color};
              margin:0 auto;
            "></div>
          </div>`,
        iconSize: [80, 40],
        iconAnchor: [40, 40],
      })

      const marker = L.marker(coords, { icon: svgIcon }).addTo(map)

      marker.on('click', () => {
        setSelected({ unit: u, stats: s })
      })

      markersRef.current[u.id] = marker
    })
  }, [unitStats])

  // ── Draw custom pins ──────────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L
    if (!L || !mapInstance.current) return
    const map = mapInstance.current

    // Remove old custom pins (stored in markersRef with 'pin_' prefix)
    Object.keys(markersRef.current).filter(k => k.startsWith('pin_')).forEach(k => {
      map.removeLayer(markersRef.current[k])
      delete markersRef.current[k]
    })

    const PIN_COLORS = { blue: '#3b82f6', red: '#ef4444', yellow: '#eab308', purple: '#a855f7', white: '#ffffff' }

    pins.forEach(pin => {
      const color = PIN_COLORS[pin.color] || '#3b82f6'
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="text-align:center">
            <div style="
              background:${color};
              color:#000;
              font-size:10px;
              font-weight:800;
              padding:2px 7px;
              border-radius:5px;
              border:2px solid rgba(0,0,0,0.3);
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
              white-space:nowrap;
            ">📍 ${pin.label}</div>
            <div style="
              width:0;height:0;
              border-left:5px solid transparent;
              border-right:5px solid transparent;
              border-top:7px solid ${color};
              margin:0 auto;
            "></div>
          </div>`,
        iconSize: [80, 30],
        iconAnchor: [40, 30],
      })

      const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map)
      if (pin.note) marker.bindTooltip(pin.note, { direction: 'top' })
      if (canEdit) {
        marker.on('contextmenu', () => {
          if (confirm(`למחוק נקודה "${pin.label}"?`)) deletePin(pin.id)
        })
      }
      markersRef.current['pin_' + pin.id] = marker
    })
  }, [pins])

  const h = selected?.stats?.health || 'orange'

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-text3">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"/><span>תקין</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"/><span>דורש תשומת לב</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><span>קריטי</span></div>
        <div className="flex items-center gap-1.5 text-blue-400">📍<span>נקודה מותאמת</span></div>
        {canEdit && <span className="text-yellow-400/70">· לחץ על המפה להוספת נקודה · לחץ ימני על נקודה למחיקה</span>}
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-border1" style={{ height: '520px' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%', direction: 'ltr' }} />

        {/* Selected unit panel */}
        {selected && (
          <div className="absolute bottom-4 right-4 z-[999] bg-bg1/95 backdrop-blur border border-border1 rounded-2xl p-4 w-64 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selected.unit.icon}</span>
                <div>
                  <div className="font-black text-sm">{selected.unit.name}</div>
                  <div className="text-text3 text-xs">{selected.unit.brigade}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-text3 hover:text-text1 text-lg">✕</button>
            </div>
            <div className={`text-xs font-black mb-3 px-2 py-1 rounded-lg text-center
              ${h==='green'?'bg-green-900/40 text-green-400':h==='red'?'bg-red-900/40 text-red-400':'bg-orange-900/40 text-orange-400'}`}>
              {HEALTH_LABEL[h]}
            </div>
            <div className="space-y-2">
              {[
                { label: '🎓 הכשרה', val: selected.stats.trainedPct || 0 },
                { label: '🧹 ניקיון', val: selected.stats.cleanPct || 0 },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="text-xs text-text3 w-20">{m.label}</span>
                  <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.val>=80?'bg-green-500':m.val>=50?'bg-orange-500':'bg-red-500'}`}
                      style={{ width: `${m.val}%` }} />
                  </div>
                  <span className="text-xs font-bold text-text2 w-8">{m.val}%</span>
                </div>
              ))}
            </div>
            {selected.stats.openInc > 0 && (
              <div className="mt-2 text-red-400 text-xs font-bold">🆘 {selected.stats.openInc} חריגים פתוחים</div>
            )}
            {selected.stats.equipMissing > 0 && (
              <div className="text-orange-400 text-xs font-bold">📦 {selected.stats.equipMissing} ציוד חסר</div>
            )}
          </div>
        )}
      </div>

      {/* Custom pins list */}
      {pins.length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <span className="panel-title">📍 נקודות על המפה</span>
            <span className="text-text3 text-xs">{pins.length} נקודות</span>
          </div>
          <div className="divide-y divide-border1/50">
            {pins.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-base">📍</span>
                <span className="font-bold flex-1">{p.label}</span>
                {p.note && <span className="text-text3 text-xs">{p.note}</span>}
                <span className="text-text3 text-xs">{p.created_by}</span>
                {canEdit && (
                  <button onClick={() => deletePin(p.id)}
                    className="text-red-400/50 hover:text-red-400 text-xs transition-colors">🗑</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add pin modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="📍 הוספת נקודה למפה">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">שם הנקודה *</label>
            <input className="form-input" placeholder="לדוגמה: מחסן כשרות, עמדת בדיקה..."
              value={pinForm.label} onChange={e => setPinForm(f => ({ ...f, label: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">הערה (אופציונלי)</label>
            <input className="form-input" placeholder="מידע נוסף..."
              value={pinForm.note} onChange={e => setPinForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">צבע</label>
            <div className="flex gap-2">
              {[['blue','🔵 כחול'],['red','🔴 אדום'],['yellow','🟡 צהוב'],['purple','🟣 סגול'],['white','⚪ לבן']].map(([c,l]) => (
                <button key={c} onClick={() => setPinForm(f => ({ ...f, color: c }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${pinForm.color === c ? 'border-gold bg-gold/20 text-gold' : 'border-border2 text-text3 hover:border-border1'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {clickLatLng && (
            <div className="text-xs text-text3 font-mono bg-bg3 rounded-lg px-3 py-2" dir="ltr">
              {clickLatLng.lat.toFixed(4)}, {clickLatLng.lng.toFixed(4)}
            </div>
          )}
        </div>
        <ModalButtons onClose={() => setAddModal(false)} onSave={savePin} saveLabel="📍 הוסף נקודה" />
      </Modal>
    </div>
  )
}
