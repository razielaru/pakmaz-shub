import { useGPS } from '../../hooks/useGPS'
import Spinner from '../ui/Spinner'

export default function GPSCheckpoint({ checkpointNum, base, onCapture }) {
  const key = `cp_${checkpointNum}_${base}`
  const gps = useGPS(key)

  async function handleCapture() {
    const pos = await gps.capture()
    if (pos && onCapture) onCapture(pos)
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${gps.hasFix ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-semibold text-sm text-gray-800">
              נקודת ביקורת GPS #{checkpointNum}
            </p>
            {gps.hasFix ? (
              <p className="text-xs text-green-700 font-medium">
                ✅ מיקום נשמר — {gps.nearestBase?.name} ({gps.nearestBase?.distanceKm.toFixed(1)} ק"מ)
              </p>
            ) : (
              <p className="text-xs text-gray-500">לחץ לאישור מיקום פיזי</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {gps.hasFix ? (
            <button onClick={gps.reset} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 hover:border-red-300 transition-all">
              🔄 עדכן
            </button>
          ) : (
            <button
              onClick={handleCapture}
              disabled={gps.loading}
              className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5"
            >
              {gps.loading ? <Spinner size="sm" color="white" /> : '📍'}
              {gps.loading ? 'מאתר...' : 'אשר מיקום'}
            </button>
          )}
        </div>
      </div>
      {gps.error && (
        <p className="text-xs text-red-600 mt-2">⚠️ {gps.error} — ודא שהרשאות מיקום מופעלות</p>
      )}
    </div>
  )
}
