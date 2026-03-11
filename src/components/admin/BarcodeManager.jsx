// src/components/admin/BarcodeManager.jsx
import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../supabaseClient'
import { BASE_BARCODES } from '../../utils/constants'
import toast from 'react-hot-toast'

export default function BarcodeManager({ unit }) {
  const [barcodes, setBarcodes] = useState(BASE_BARCODES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCustomBarcodes() {
      const { data } = await supabase.from('base_barcodes').select('*').eq('unit', unit)
      if (data && data.length > 0) {
        const customMap = {}
        data.forEach(b => customMap[b.base] = b.barcode)
        setBarcodes(prev => ({ ...prev, ...customMap }))
      }
      setLoading(false)
    }
    fetchCustomBarcodes()
  }, [unit])

  const handleUpdate = async (base, newCode) => {
    if (!newCode) return
    try {
      await supabase.from('base_barcodes').upsert({ unit, base, barcode: newCode }, { onConflict: 'unit,base' })
      setBarcodes(prev => ({ ...prev, [base]: newCode }))
      toast.success(`ברקוד ל-${base} עודכן!`)
    } catch (err) {
      toast.error('שגיאה בעדכון הברקוד')
    }
  }

  if (loading) return <div>טוען נתונים...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">🏷️ ניהול ברקודים למוצבים</h3>
          <p className="text-sm text-gray-500">הקודים משמשים לסריקה חיה ואימות נוכחות דרך המצלמה</p>
        </div>
        <button onClick={() => window.print()} className="btn-outline hidden md:block">
          🖨️ הדפס את כל הברקודים
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(barcodes).map(([base, code]) => (
          <div key={base} className="border border-gray-200 rounded-xl p-4 flex gap-4 items-center bg-gray-50">
            <div className="bg-white p-2 border rounded-lg print:border-none">
              <QRCodeSVG value={code} size={80} level="H" fgColor="#1e3a8a" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-lg mb-1">{base}</h4>
              <input 
                type="text" 
                defaultValue={code} 
                onBlur={(e) => handleUpdate(base, e.target.value)}
                className="w-full text-sm p-1.5 border rounded border-gray-300 text-left" 
                dir="ltr"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
