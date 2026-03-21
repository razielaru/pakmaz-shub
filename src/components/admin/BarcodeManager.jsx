// src/components/admin/BarcodeManager.jsx
import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabaseClient'
import { useBaseRegistry } from '../../hooks/useBaseRegistry'
import { useAuth } from '../../context/AuthContext'
import { logAdminAudit } from '../../utils/audit'

const NFC_SUPPORTED = typeof window !== 'undefined' && 'NDEFReader' in window

function buildDynamicPayload(base, barcode, coords) {
  if (!barcode || !coords) return barcode || ''
  const [lat, lon] = coords
  return `BASE=${barcode}|LAT=${lat}|LON=${lon}|NAME=${encodeURIComponent(base)}`
}

export default function BarcodeManager({ unit }) {
  const { user } = useAuth()
  const registry = useBaseRegistry(unit)
  const { baseNames, coordinates, barcodes, notes, refetch, isLoading } = registry

  const [qrMode, setQrMode] = useState('dynamic')
  const [nfcBase, setNfcBase] = useState(null)
  const [nfcStatus, setNfcStatus] = useState(null)
  const [drafts, setDrafts] = useState({})

  const [newBase, setNewBase] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newLat, setNewLat] = useState('')
  const [newLon, setNewLon] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const entries = useMemo(() => (
    baseNames.map((base) => ({
      base,
      barcode: barcodes[base] || '',
      coords: coordinates[base] || null,
      notes: notes[base] || '',
    }))
  ), [baseNames, barcodes, coordinates, notes])

  useEffect(() => {
    const nextDrafts = {}
    entries.forEach((entry) => {
      nextDrafts[entry.base] = {
        barcode: entry.barcode,
        latitude: entry.coords?.[0] ?? '',
        longitude: entry.coords?.[1] ?? '',
        notes: entry.notes || '',
      }
    })
    setDrafts(nextDrafts)
  }, [entries])

  function setDraft(base, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [base]: {
        ...(prev[base] || {}),
        [field]: value,
      },
    }))
  }

  async function saveBase(base) {
    const draft = drafts[base]
    if (!draft?.barcode?.trim()) {
      toast.error('יש להזין ברקוד לפני שמירה')
      return
    }

    const latitude = draft.latitude === '' ? null : Number(draft.latitude)
    const longitude = draft.longitude === '' ? null : Number(draft.longitude)

    if ((latitude != null && !Number.isFinite(latitude)) || (longitude != null && !Number.isFinite(longitude))) {
      toast.error('קואורדינטות לא תקינות')
      return
    }

    const { error } = await supabase.from('base_barcodes').upsert(
      {
        unit,
        base,
        barcode: draft.barcode.trim(),
        latitude,
        longitude,
        notes: draft.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'unit,base' }
    )

    if (error) {
      toast.error('שגיאה בשמירת המוצב: ' + error.message)
      return
    }

    await logAdminAudit({
      action: 'base_barcode_updated',
      actorName: user?.displayName,
      actorUnit: user?.unit,
      targetUnit: unit,
      details: JSON.stringify({
        base,
        barcode: draft.barcode.trim(),
        latitude,
        longitude,
      }),
    })

    toast.success(`הגדרות המוצב ${base} נשמרו`)
    refetch()
  }

  async function handleDelete(base) {
    if (!confirm(`למחוק את ההגדרות המקומיות עבור ${base}?`)) return

    const { error } = await supabase.from('base_barcodes').delete().eq('unit', unit).eq('base', base)
    if (error) {
      toast.error('שגיאה במחיקה: ' + error.message)
      return
    }

    await logAdminAudit({
      action: 'base_barcode_deleted',
      actorName: user?.displayName,
      actorUnit: user?.unit,
      targetUnit: unit,
      details: base,
    })

    toast.success(`ההגדרות של ${base} הוסרו`)
    refetch()
  }

  async function handleAdd() {
    if (!newBase.trim() || !newCode.trim()) {
      toast.error('שם מוצב וברקוד הם שדות חובה')
      return
    }

    const latitude = newLat === '' ? null : Number(newLat)
    const longitude = newLon === '' ? null : Number(newLon)

    if ((latitude != null && !Number.isFinite(latitude)) || (longitude != null && !Number.isFinite(longitude))) {
      toast.error('קואורדינטות לא תקינות')
      return
    }

    const { error } = await supabase.from('base_barcodes').upsert(
      {
        unit,
        base: newBase.trim(),
        barcode: newCode.trim(),
        latitude,
        longitude,
        notes: newNotes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'unit,base' }
    )

    if (error) {
      toast.error('שגיאה בהוספה: ' + error.message)
      return
    }

    await logAdminAudit({
      action: 'base_barcode_created',
      actorName: user?.displayName,
      actorUnit: user?.unit,
      targetUnit: unit,
      details: JSON.stringify({
        base: newBase.trim(),
        barcode: newCode.trim(),
        latitude,
        longitude,
      }),
    })

    toast.success(`${newBase.trim()} נוסף בהצלחה`)
    setNewBase('')
    setNewCode('')
    setNewLat('')
    setNewLon('')
    setNewNotes('')
    setShowAddForm(false)
    refetch()
  }

  async function writeNFC(base) {
    if (!NFC_SUPPORTED) {
      toast.error('נדרש Chrome ל-Android')
      return
    }

    const draft = drafts[base]
    const latitude = draft?.latitude === '' ? null : Number(draft?.latitude)
    const longitude = draft?.longitude === '' ? null : Number(draft?.longitude)
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude)
    const payload = buildDynamicPayload(base, draft?.barcode, hasCoords ? [latitude, longitude] : null)

    if (!payload) {
      toast.error('חסר payload לכתיבת NFC')
      return
    }

    setNfcBase(base)
    setNfcStatus('⏳ קרב תגית NFC למכשיר...')

    try {
      const ndef = new window.NDEFReader()
      await ndef.write({ records: [{ recordType: 'text', data: payload }] })
      setNfcStatus(`✅ NFC ל-${base} נכתב!`)
      toast.success(`NFC ל-${base} נכתב`)
    } catch (error) {
      setNfcStatus(`❌ ${error.message}`)
    } finally {
      setTimeout(() => {
        setNfcBase(null)
        setNfcStatus(null)
      }, 4000)
    }
  }

  function getQRValue(base) {
    const draft = drafts[base]
    const latitude = draft?.latitude === '' ? null : Number(draft?.latitude)
    const longitude = draft?.longitude === '' ? null : Number(draft?.longitude)
    const coords = Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null

    if (qrMode === 'dynamic') {
      return buildDynamicPayload(base, draft?.barcode, coords) || draft?.barcode || ''
    }

    return draft?.barcode || ''
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">טוען נתוני מוצבים...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-800">🏷️ ניהול מוצבים, QR וקואורדינטות</h3>
          <p className="text-sm text-gray-500">הנתונים נשמרים קבוע ב-Supabase ומשמשים את הטופס, ה-QR והמפות</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setQrMode('dynamic')}
              className={`px-3 py-1.5 transition-colors ${qrMode === 'dynamic' ? 'bg-idf-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              QR דינמי + GPS
            </button>
            <button
              onClick={() => setQrMode('legacy')}
              className={`px-3 py-1.5 transition-colors ${qrMode === 'legacy' ? 'bg-idf-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              קוד בלבד
            </button>
          </div>

          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all"
          >
            ➕ הוסף מוצב
          </button>
          <button onClick={() => window.print()} className="btn-outline text-xs">
            🖨️ הדפס
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <h4 className="font-bold text-green-800 text-sm">➕ הוסף מוצב חדש</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">שם מוצב *</label>
              <input value={newBase} onChange={(e) => setNewBase(e.target.value)} placeholder="לדוגמה: מוצב גלעד" className="input-field text-sm" />
            </div>
            <div>
              <label className="label">קוד ברקוד *</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="RB_GILAD_01" className="input-field text-sm font-mono" dir="ltr" />
            </div>
            <div>
              <label className="label">קו רוחב</label>
              <input type="number" value={newLat} onChange={(e) => setNewLat(e.target.value)} className="input-field text-sm" step="0.000001" />
            </div>
            <div>
              <label className="label">קו אורך</label>
              <input type="number" value={newLon} onChange={(e) => setNewLon(e.target.value)} className="input-field text-sm" step="0.000001" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">הערת מנהל</label>
              <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="input-field text-sm min-h-[80px]" placeholder="לדוגמה: קואורדינטות עודכנו לפי בדיקה מיום..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-success text-sm py-1.5 px-4">✅ שמור מוצב</button>
            <button onClick={() => setShowAddForm(false)} className="btn-outline text-sm py-1.5 px-4">ביטול</button>
          </div>
        </div>
      )}

      {qrMode === 'dynamic' && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
          <strong>QR דינמי פעיל</strong> — כל QR מכיל קוד, קואורדינטות ושם מוצב מתוך מסד הנתונים.
        </div>
      )}

      {nfcStatus && (
        <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm font-semibold text-purple-800">
          {nfcStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map((entry) => {
          const draft = drafts[entry.base] || {}
          const qrValue = getQRValue(entry.base)
          const hasCoords = draft.latitude !== '' && draft.longitude !== ''

          return (
            <div key={entry.base} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <div className="flex gap-4 items-start">
                <div className="bg-white p-2 border rounded-lg print:border-none shrink-0">
                  <QRCodeSVG value={qrValue || entry.base} size={84} level="H" fgColor="#1e3a8a" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-gray-800 text-base">{entry.base}</h4>
                    <button
                      onClick={() => handleDelete(entry.base)}
                      className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-lg border border-transparent hover:border-red-200 transition-all"
                    >
                      🗑️ מחק
                    </button>
                  </div>

                  <input
                    type="text"
                    value={draft.barcode || ''}
                    onChange={(e) => setDraft(entry.base, 'barcode', e.target.value)}
                    className="w-full text-xs p-1.5 border rounded border-gray-300 text-left font-mono"
                    dir="ltr"
                    placeholder="קוד ברקוד"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={draft.latitude ?? ''}
                      onChange={(e) => setDraft(entry.base, 'latitude', e.target.value)}
                      className="w-full text-xs p-1.5 border rounded border-gray-300"
                      step="0.000001"
                      placeholder="Latitude"
                    />
                    <input
                      type="number"
                      value={draft.longitude ?? ''}
                      onChange={(e) => setDraft(entry.base, 'longitude', e.target.value)}
                      className="w-full text-xs p-1.5 border rounded border-gray-300"
                      step="0.000001"
                      placeholder="Longitude"
                    />
                  </div>

                  <textarea
                    value={draft.notes || ''}
                    onChange={(e) => setDraft(entry.base, 'notes', e.target.value)}
                    className="w-full text-xs p-2 border rounded border-gray-300 min-h-[68px]"
                    placeholder="הערת מיקום / מקור הקואורדינטות"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => saveBase(entry.base)} className="btn-primary text-xs py-1.5 px-3">
                  💾 שמור
                </button>

                {NFC_SUPPORTED ? (
                  <button
                    onClick={() => writeNFC(entry.base)}
                    disabled={nfcBase === entry.base || !hasCoords}
                    className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      hasCoords
                        ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {nfcBase === entry.base ? '⏳' : '📡'} כתוב NFC
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 px-2 py-1 border border-dashed border-gray-200 rounded-lg">
                    📡 NFC — Chrome/Android בלבד
                  </span>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrValue)
                    toast.success('Payload הועתק')
                  }}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-all"
                >
                  📋 העתק payload
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
