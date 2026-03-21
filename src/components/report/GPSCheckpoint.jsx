// src/components/report/GPSCheckpoint.jsx
import { useState, useRef, useEffect } from 'react'
import { useGPS } from '../../hooks/useGPS'
import { parseDynamicQR } from '../../utils/constants'
import { buildGpsAssessment } from '../../utils/gpsAssessment'
import Spinner from '../ui/Spinner'
import jsQR from 'jsqr'

export default function GPSCheckpoint({ checkpointNum, base, referenceCoords, onCapture, onBaseDetected }) {
  const key = `cp_${checkpointNum}_${base}`
  const gps = useGPS(key)

  const [scanning, setScanning]       = useState(false)
  const [scanResult, setScanResult]   = useState(null) // { base, code }
  const [scanError, setScanError]     = useState(null)
  const [cameraStream, setCameraStream] = useState(null)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const animRef     = useRef(null)

  // חישוב מרחק GPS בזמן אמת לפי המוצב הנבחר
  const gpsAlert = buildGpsAssessment({
    lat: gps.lat,
    lon: gps.lon,
    base,
    accuracy: gps.accuracy,
    referenceCoords,
  })

  // ─── פתיחת מצלמה ───
  async function startScan() {
    setScanError(null)
    setScanResult(null)
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        requestAnimationFrame(tick)
      }
    } catch (e) {
      setScanError('לא ניתן לגשת למצלמה — ודא שהרשאות מצלמה מופעלות')
      setScanning(false)
    }
  }

  // ─── לולאת סריקה ───
  function tick() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code) {
      // פענוח QR — תמיכה ב-QR ישן (קוד בלבד) וחדש (עם קואורדינטות)
      const parsed = parseDynamicQR(code.data)
      if (parsed) {
        stopScan()
        let qrWarning = null

        // אם ה-QR החדש מכיל קואורדינטות — בדוק מרחק GPS מ-QR
        if (
          Number.isFinite(parsed.lat) &&
          Number.isFinite(parsed.lon) &&
          gps.lat != null &&
          gps.lon != null
        ) {
          const qrAssessment = buildGpsAssessment({
            lat: gps.lat,
            lon: gps.lon,
            base: parsed.name,
            accuracy: gps.accuracy,
            referenceCoords: [parsed.lat, parsed.lon],
          })
          if (qrAssessment?.level === 'danger') {
            qrWarning = `🚨 GPS רחוק ${qrAssessment.distKm.toFixed(1)} ק"מ מהמיקום שב-QR`
          } else if (qrAssessment?.level === 'uncertain') {
            qrWarning = `⚠️ יש פער של ${qrAssessment.distKm.toFixed(1)} ק"מ, אבל דיוק ה-GPS חלש כרגע`
          }
        }

        setScanResult({ base: parsed.name, code: parsed.code, qrWarning })
        if (onBaseDetected) onBaseDetected(parsed)
      } else {
        setScanError(`קוד לא מוכר: ${code.data}`)
        stopScan()
      }
    } else {
      animRef.current = requestAnimationFrame(tick)
    }
  }

  // ─── סגירת מצלמה ───
  function stopScan() {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setScanning(false)
  }

  useEffect(() => () => stopScan(), [])

  async function handleCapture() {
    const pos = await gps.capture()
    if (pos && onCapture) onCapture(pos)
  }

  return (
    <div className={`rounded-xl border-2 p-3 transition-all ${
      gps.hasFix
        ? gpsAlert?.level === 'danger'  ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
        : gpsAlert?.level === 'warning' || gpsAlert?.level === 'uncertain' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
        : 'border-green-400 bg-green-50 dark:bg-green-900/10'
        : 'border-gray-200 bg-gray-50 dark:bg-dark-surface2'
    }`}>

      {/* שורה ראשית: GPS */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">📍</span>
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-dark-text">
              נקודת ביקורת GPS #{checkpointNum}
            </p>
            {gps.hasFix ? (
              gpsAlert ? (
                gpsAlert.level === 'danger' ? (
                  <p className="text-xs text-red-700 dark:text-red-400 font-bold">
                    ⚠️ פער של {gpsAlert.distKm.toFixed(1)} ק"מ מ-{base} — הדוח יסומן לבדיקה, אבל לא ייחסם
                  </p>
                ) : gpsAlert.level === 'uncertain' ? (
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold">
                    ⚠️ זוהה פער של {gpsAlert.distKm.toFixed(1)} ק"מ, אבל דיוק ה-GPS חלש כרגע
                  </p>
                ) : gpsAlert.level === 'warning' ? (
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold">
                    ⚠️ {gpsAlert.distKm.toFixed(1)} ק"מ מ-{base} — חריג, מומלץ לרענן או לסרוק QR
                  </p>
                ) : (
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                    ✅ {gpsAlert.distKm.toFixed(2)} ק"מ מ-{base} — מיקום תואם
                  </p>
                )
              ) : (
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                  ✅ מיקום נשמר — {gps.nearestBase?.name} ({gps.nearestBase?.distanceKm.toFixed(1)} ק"מ)
                </p>
              )
            ) : (
              <p className="text-xs text-gray-500 dark:text-dark-muted">לחץ לאישור מיקום פיזי</p>
            )}
            {gps.hasFix && (
              <p className="text-[11px] text-gray-500 dark:text-dark-muted mt-1">
                דיוק משוער: {gps.accuracy ? `${gps.accuracy} מ'` : 'לא זמין'}
                {gpsAlert?.referenceSource === 'qr' ? ' | אימות לפי QR' : ' | אימות לפי רשימת מוצבים'}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* כפתור ברקוד */}
          {!scanning && !scanResult && (
            <button
              type="button"
              onClick={startScan}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-idf-blue/10 hover:bg-idf-blue/20 text-idf-blue dark:text-dark-blue border border-idf-blue/20 transition-all"
            >
              📷 סרוק ברקוד מוצב
            </button>
          )}

          {/* כפתור GPS */}
          {gps.hasFix ? (
            <button type="button" onClick={gps.reset}
              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 hover:border-red-300 transition-all">
              🔄 עדכן
            </button>
          ) : (
            <button type="button" onClick={handleCapture} disabled={gps.loading}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              {gps.loading ? <Spinner size="sm" color="white" /> : '📍'}
              {gps.loading ? 'מאתר...' : 'אשר מיקום'}
            </button>
          )}
        </div>
      </div>

      {/* תוצאת סריקה מוצלחת */}
      {scanResult && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 border border-green-300 rounded-lg px-3 py-2">
            <span className="text-green-600 font-bold text-sm">✅ בסיס זוהה:</span>
            <span className="font-extrabold text-green-800 dark:text-green-300">{scanResult.base}</span>
            <button type="button" onClick={() => setScanResult(null)}
              className="mr-auto text-xs text-gray-400 hover:text-red-500 transition-colors">✕</button>
          </div>
          {scanResult.qrWarning && (
            <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 border border-red-300 rounded-lg px-3 py-2">
              <span className="text-red-700 font-bold text-xs">{scanResult.qrWarning}</span>
            </div>
          )}
        </div>
      )}

      {/* מצלמה פעילה */}
      {scanning && (
        <div className="mt-3 space-y-2">
          <div className="relative rounded-xl overflow-hidden bg-black" style={{ height: 220 }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {/* מסגרת סריקה */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/70 rounded-xl relative">
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                {/* קו סריקה מונפש */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-400/80 animate-pulse-soft" />
              </div>
            </div>
            <p className="absolute bottom-2 inset-x-0 text-center text-white text-xs font-semibold">
              כוון את המצלמה לברקוד של המוצב
            </p>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button type="button" onClick={stopScan}
            className="w-full text-xs text-gray-500 hover:text-red-600 font-semibold py-1.5 border border-gray-200 rounded-lg transition-colors">
            ✕ בטל סריקה
          </button>
        </div>
      )}

      {/* הרשאה נדחתה — הנחיה ברורה */}
      {gps.isDenied && (
        <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-red-700 dark:text-red-400">🚫 הרשאת מיקום נדחתה</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            לחץ 🔒 בשורת הכתובת ← מיקום ← <strong>אפשר</strong>, ורענן את הדף.
          </p>
        </div>
      )}

      {/* שגיאות אחרות */}
      {gps.error && !gps.isDenied && !scanning && (
        <p className="text-xs text-red-600 mt-2">⚠️ {gps.error}</p>
      )}
      {scanError && (
        <p className="text-xs text-red-600 mt-2">⚠️ {scanError}</p>
      )}
    </div>
  )
}
